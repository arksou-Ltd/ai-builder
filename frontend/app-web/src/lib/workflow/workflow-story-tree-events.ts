/**
 * Epic/Story 导航树事件适配层
 *
 * 统一处理 Story 选择和状态更新事件，对齐 ADR-005 事件语义。
 * 遵循 Story 3.2 的 subscribeWorkflowStepEvents 模式。
 * 预留 Story 3.4 WebSocket In-flow updates 接入函数。
 *
 * 事件格式：
 * workflow.story.select: { storyId: string }
 * workflow.story.status: { storyId: string, status: string }
 */

import {
  type StoryExecutionStatus,
  isValidStoryStatus,
} from "./workflow-story-tree";
import { useStoryTreeStore } from "./workflow-story-tree-store";

// ─── 事件类型定义（对齐 ADR-005） ───────────────────────────────

export interface StorySelectEvent {
  /** 要选中的 Story ID */
  storyId: string;
}

export interface StoryStatusEvent {
  /** Story ID */
  storyId: string;
  /** 新状态 */
  status: string;
}

export const STORY_SELECT_EVENT_NAME = "workflow.story.select";
export const STORY_STATUS_EVENT_NAME = "workflow.story.status";

// ─── 事件处理器 ─────────────────────────────────────────────────

/**
 * 处理 Story 选中事件
 *
 * 校验事件合法性后更新 store。
 */
export function handleStorySelectEvent(
  workspaceId: string,
  event: StorySelectEvent,
): boolean {
  if (!event.storyId || typeof event.storyId !== "string") {
    return false;
  }

  const store = useStoryTreeStore.getState();
  return store.selectStory(workspaceId, event.storyId);
}

/**
 * 处理 Story 状态更新事件
 *
 * 校验状态合法性后更新 store。
 */
export function handleStoryStatusEvent(
  workspaceId: string,
  event: StoryStatusEvent,
): boolean {
  if (
    !event.storyId ||
    typeof event.storyId !== "string" ||
    !isValidStoryStatus(event.status)
  ) {
    return false;
  }

  const store = useStoryTreeStore.getState();
  store.syncStoryStatuses(workspaceId, [
    { storyId: event.storyId, status: event.status as StoryExecutionStatus },
  ]);
  return true;
}

// ─── 事件分发（本地真实事件源） ────────────────────────────────

/**
 * 分发 Story 选中事件
 */
export function dispatchStorySelectEvent(
  storyId: string,
  workspaceId?: string,
): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(STORY_SELECT_EVENT_NAME, {
      detail: { storyId, workspaceId },
    }),
  );
}

/**
 * 分发 Story 状态更新事件
 */
export function dispatchStoryStatusEvent(
  storyId: string,
  status: StoryExecutionStatus,
  workspaceId?: string,
): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(STORY_STATUS_EVENT_NAME, {
      detail: { storyId, status, workspaceId },
    }),
  );
}

// ─── 事件订阅 ───────────────────────────────────────────────────

/**
 * 订阅浏览器真实事件源（CustomEvent），并同步到 Story 导航树 store。
 * 返回取消订阅函数，用于页面卸载清理。
 *
 * 遵循 Story 3.2 的 subscribeWorkflowStepEvents 模式。
 */
export function subscribeStoryTreeEvents(workspaceId: string): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onSelectEvent = (evt: Event) => {
    const customEvt = evt as CustomEvent<{
      storyId: string;
      workspaceId?: string;
    }>;
    const detail = customEvt.detail;
    if (!detail || typeof detail.storyId !== "string") return;

    const targetWorkspaceId = detail.workspaceId ?? workspaceId;
    handleStorySelectEvent(targetWorkspaceId, { storyId: detail.storyId });
  };

  const onStatusEvent = (evt: Event) => {
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
    )
      return;

    const targetWorkspaceId = detail.workspaceId ?? workspaceId;
    handleStoryStatusEvent(targetWorkspaceId, {
      storyId: detail.storyId,
      status: detail.status,
    });
  };

  window.addEventListener(
    STORY_SELECT_EVENT_NAME,
    onSelectEvent as EventListener,
  );
  window.addEventListener(
    STORY_STATUS_EVENT_NAME,
    onStatusEvent as EventListener,
  );

  return () => {
    window.removeEventListener(
      STORY_SELECT_EVENT_NAME,
      onSelectEvent as EventListener,
    );
    window.removeEventListener(
      STORY_STATUS_EVENT_NAME,
      onStatusEvent as EventListener,
    );
  };
}

// ─── WebSocket 接入点（Story 3.4 预留） ─────────────────────────

/**
 * WebSocket Story 状态消息适配器
 *
 * 将 WebSocket 原始消息转换为 StoryStatusEvent 并处理。
 * Story 3.4 实现 WebSocket 连接后，在 onMessage 回调中调用此函数。
 *
 * @example
 * // Story 3.4 接入示例：
 * // ws.onMessage((msg) => {
 * //   if (msg.type === "workflow.story.status") {
 * //     adaptWebSocketStoryMessage(workspaceId, msg.payload);
 * //   }
 * // });
 */
export function adaptWebSocketStoryMessage(
  workspaceId: string,
  payload: unknown,
): boolean {
  if (!payload || typeof payload !== "object") return false;

  const record = payload as Record<string, unknown>;
  if (
    typeof record.storyId !== "string" ||
    typeof record.status !== "string"
  ) {
    return false;
  }

  return handleStoryStatusEvent(workspaceId, {
    storyId: record.storyId,
    status: record.status,
  });
}
