/**
 * 中间对话事件适配层
 *
 * 订阅并适配现有 workflow.step、workflow.story.status 事件，
 * 将状态变化注入对话流（In-flow Updates）。
 *
 * 严格复用已有事件语义，不重复造新的"并行状态源"。
 * 预留 WebSocket 接入函数（与 ADR-005 一致）。
 */

import {
  WORKFLOW_STEP_EVENT_NAME,
  WORKFLOW_STEP_BATCH_EVENT_NAME,
  type WorkflowStepEvent,
} from "./workflow-step-events";
import {
  STORY_STATUS_EVENT_NAME,
} from "./workflow-story-tree-events";
import {
  mapStepEventToInFlow,
  mapStoryStatusEventToInFlow,
} from "./workflow-conversation";
import { useConversationStore } from "./workflow-conversation-store";

export const AI_THINKING_EVENT_NAME = "ai.thinking";

// ─── 消息 ID 生成器 ─────────────────────────────────────────────

let inFlowCounter = 0;

function generateInFlowMessageId(sourceEvent: string): string {
  inFlowCounter += 1;
  return `inflow-${sourceEvent}-${Date.now()}-${inFlowCounter}`;
}

// ─── 事件处理器 ─────────────────────────────────────────────────

/**
 * 处理 workflow.step 事件并注入对话流
 */
function handleStepEventForConversation(
  workspaceId: string,
  event: WorkflowStepEvent,
): void {
  const mapping = mapStepEventToInFlow(event.step, event.status);
  const messageId = generateInFlowMessageId("step");
  useConversationStore
    .getState()
    .appendInFlowUpdate(workspaceId, messageId, mapping);
}

/**
 * 处理 workflow.story.status 事件并注入对话流
 */
function handleStoryStatusEventForConversation(
  workspaceId: string,
  storyId: string,
  status: string,
): void {
  const mapping = mapStoryStatusEventToInFlow(storyId, status);
  const messageId = generateInFlowMessageId("story");
  useConversationStore
    .getState()
    .appendInFlowUpdate(workspaceId, messageId, mapping);
}

// ─── 事件订阅 ───────────────────────────────────────────────────

/**
 * 订阅 workflow.step 和 workflow.story.status 事件，
 * 将状态变化自动注入对话流。
 *
 * 返回取消订阅函数，用于页面卸载清理。
 */
export function subscribeConversationEvents(
  workspaceId: string,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onStepEvent = (evt: Event) => {
    const customEvt = evt as CustomEvent;
    const detail = customEvt.detail;
    if (!detail || typeof detail !== "object") return;

    // 支持两种 detail 格式（与 workflow-step-events.ts 一致）
    if ("event" in detail && detail.event && typeof detail.event === "object") {
      const targetWs = detail.workspaceId ?? workspaceId;
      handleStepEventForConversation(targetWs, detail.event as WorkflowStepEvent);
    } else if ("step" in detail && "status" in detail) {
      handleStepEventForConversation(workspaceId, detail as WorkflowStepEvent);
    }
  };

  const onBatchStepEvent = (evt: Event) => {
    const customEvt = evt as CustomEvent;
    const detail = customEvt.detail;
    if (!detail || typeof detail !== "object") return;

    let events: WorkflowStepEvent[] = [];
    let targetWs = workspaceId;

    if ("events" in detail && Array.isArray(detail.events)) {
      events = detail.events;
      targetWs = detail.workspaceId ?? workspaceId;
    } else if (Array.isArray(detail)) {
      events = detail;
    }

    for (const event of events) {
      handleStepEventForConversation(targetWs, event);
    }
  };

  const onStoryStatusEvent = (evt: Event) => {
    const customEvt = evt as CustomEvent<{
      storyId: string;
      status: string;
      workspaceId?: string;
    }>;
    const detail = customEvt.detail;
    if (
      !detail ||
      typeof detail.storyId !== "string" ||
      typeof detail.status !== "string"
    ) {
      return;
    }

    const targetWs = detail.workspaceId ?? workspaceId;
    handleStoryStatusEventForConversation(
      targetWs,
      detail.storyId,
      detail.status,
    );
  };

  const onAiThinkingEvent = (evt: Event) => {
    const customEvt = evt as CustomEvent<{
      workspaceId?: string;
      payload?: unknown;
      action?: string;
      messageId?: string;
      content?: string;
      thinkingContent?: string;
    }>;
    const detail = customEvt.detail;
    if (!detail || typeof detail !== "object") return;

    const targetWs = detail.workspaceId ?? workspaceId;
    const payload =
      typeof detail.payload === "object" && detail.payload
        ? detail.payload
        : {
            action: detail.action,
            messageId: detail.messageId,
            content: detail.content,
            thinkingContent: detail.thinkingContent,
          };

    adaptWebSocketAiThinkingMessage(targetWs, payload);
  };

  window.addEventListener(
    WORKFLOW_STEP_EVENT_NAME,
    onStepEvent as EventListener,
  );
  window.addEventListener(
    WORKFLOW_STEP_BATCH_EVENT_NAME,
    onBatchStepEvent as EventListener,
  );
  window.addEventListener(
    STORY_STATUS_EVENT_NAME,
    onStoryStatusEvent as EventListener,
  );
  window.addEventListener(
    AI_THINKING_EVENT_NAME,
    onAiThinkingEvent as EventListener,
  );

  return () => {
    window.removeEventListener(
      WORKFLOW_STEP_EVENT_NAME,
      onStepEvent as EventListener,
    );
    window.removeEventListener(
      WORKFLOW_STEP_BATCH_EVENT_NAME,
      onBatchStepEvent as EventListener,
    );
    window.removeEventListener(
      STORY_STATUS_EVENT_NAME,
      onStoryStatusEvent as EventListener,
    );
    window.removeEventListener(
      AI_THINKING_EVENT_NAME,
      onAiThinkingEvent as EventListener,
    );
  };
}

// ─── WebSocket 接入点（ADR-005 预留） ──────────────────────────

/**
 * WebSocket AI 思考消息适配器
 *
 * 将 WebSocket AI 思考消息转换为对话 store 操作。
 *
 * @example
 * // 接入示例：
 * // ws.onMessage((msg) => {
 * //   if (msg.type === "ai.thinking.start") {
 * //     adaptWebSocketAiThinkingMessage(workspaceId, msg.payload);
 * //   }
 * // });
 */
export function adaptWebSocketAiThinkingMessage(
  workspaceId: string,
  payload: unknown,
): boolean {
  if (!payload || typeof payload !== "object") return false;

  const record = payload as Record<string, unknown>;
  const action = record.action;
  const messageId = record.messageId;

  if (typeof messageId !== "string") return false;

  const store = useConversationStore.getState();

  switch (action) {
    case "start":
      store.startStreaming(workspaceId, messageId);
      return true;
    case "delta":
      if (typeof record.content !== "string") return false;
      store.appendStreamingDelta(workspaceId, messageId, record.content);
      return true;
    case "complete":
      store.completeStreaming(
        workspaceId,
        messageId,
        typeof record.thinkingContent === "string"
          ? record.thinkingContent
          : undefined,
      );
      return true;
    default:
      return false;
  }
}

/**
 * WebSocket 步骤消息适配器
 *
 * 将 WebSocket 步骤状态消息转换为 In-flow 更新并注入对话流。
 *
 * @example
 * // 接入示例：
 * // ws.onMessage((msg) => {
 * //   if (msg.type === "workflow.step") {
 * //     adaptWebSocketStepMessage(workspaceId, msg.payload);
 * //   }
 * // });
 */
export function adaptWebSocketStepMessage(
  workspaceId: string,
  payload: unknown,
): boolean {
  if (!payload || typeof payload !== "object") return false;

  const record = payload as Record<string, unknown>;
  if (typeof record.step !== "string" || typeof record.status !== "string") {
    return false;
  }

  handleStepEventForConversation(workspaceId, {
    step: record.step,
    status: record.status,
    progress: typeof record.progress === "number" ? record.progress : undefined,
  });

  return true;
}
