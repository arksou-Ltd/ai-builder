/**
 * 工作流步骤事件适配层
 *
 * 统一处理步骤状态更新输入，对齐 ADR-005 `workflow.step` 事件语义。
 * 先支持本地事件源触发更新，预留 Story 3.4 WebSocket In-flow 更新接入点。
 *
 * 事件格式（ADR-005）：
 * { step: string, status: string, progress?: number }
 */

import {
  type WorkflowStepId,
  type WorkflowStepStatus,
  WORKFLOW_STEPS,
  isValidStepId,
  isValidStepStatus,
} from "./workflow-steps";
import { useWorkflowStepsStore } from "./workflow-steps-store";

// ─── 事件类型定义（对齐 ADR-005） ───────────────────────────────

export interface WorkflowStepEvent {
  /** 步骤 ID */
  step: string;
  /** 步骤状态 */
  status: string;
  /** 进度百分比（可选，0-100） */
  progress?: number;
}

export const WORKFLOW_STEP_EVENT_NAME = "workflow.step";
export const WORKFLOW_STEP_BATCH_EVENT_NAME = "workflow.step.batch";

// ─── 事件处理器 ─────────────────────────────────────────────────

/**
 * 处理单个步骤事件
 *
 * 校验事件合法性后更新 store，确保 1 秒内同步到 UI。
 * 使用同步 store 更新，React 会在下一帧渲染，满足 1 秒 SLA。
 */
export function handleWorkflowStepEvent(
  workspaceId: string,
  event: WorkflowStepEvent,
): boolean {
  if (!isValidStepId(event.step) || !isValidStepStatus(event.status)) {
    return false;
  }

  const store = useWorkflowStepsStore.getState();
  const stepId: WorkflowStepId = event.step;
  const status: WorkflowStepStatus = event.status;

  // 如果步骤变为 in_progress，同时设置为当前步骤
  if (status === "in_progress") {
    store.setCurrentStep(workspaceId, stepId);
    return true;
  }

  if (status === "completed") {
    const currentStepId = store.getCurrentStepId(workspaceId);
    store.updateStepStatus(workspaceId, stepId, status);
    if (currentStepId === stepId) {
      store.setCurrentStep(workspaceId, getNextStepId(stepId));
    }
    return true;
  }

  store.updateStepStatus(workspaceId, stepId, status);
  return true;
}

/**
 * 批量处理步骤事件
 *
 * 用于初始化或批量同步场景，一次性更新多个步骤状态。
 */
export function handleWorkflowStepEvents(
  workspaceId: string,
  events: WorkflowStepEvent[],
): number {
  const validUpdates: Array<{ stepId: WorkflowStepId; status: WorkflowStepStatus }> = [];
  let currentStepId: WorkflowStepId | null = null;

  for (const event of events) {
    if (isValidStepId(event.step) && isValidStepStatus(event.status)) {
      validUpdates.push({
        stepId: event.step,
        status: event.status,
      });
      if (event.status === "in_progress") {
        currentStepId = event.step;
      }
    }
  }

  if (validUpdates.length === 0) return 0;

  const store = useWorkflowStepsStore.getState();

  // 如果有 in_progress 步骤，先设置当前步骤
  if (currentStepId) {
    store.setCurrentStep(workspaceId, currentStepId);
  }

  store.batchUpdateSteps(workspaceId, validUpdates);

  return validUpdates.length;
}

function getNextStepId(stepId: WorkflowStepId): WorkflowStepId | null {
  const currentIndex = WORKFLOW_STEPS.findIndex((step) => step.stepId === stepId);
  if (currentIndex < 0) return null;
  return WORKFLOW_STEPS[currentIndex + 1]?.stepId ?? null;
}

// ─── 事件分发（本地真实事件源） ────────────────────────────────

/**
 * 分发单个步骤事件
 *
 * 通过 CustomEvent 触发，由 subscribeWorkflowStepEvents 监听并更新 store。
 * 此函数是应用内触发步骤状态更新的标准入口。
 */
export function dispatchWorkflowStepEvent(
  event: WorkflowStepEvent,
  workspaceId?: string,
): void {
  if (typeof window === "undefined") return;

  const detail: WorkflowStepCustomEventDetail = workspaceId
    ? { workspaceId, event }
    : event;

  window.dispatchEvent(
    new CustomEvent(WORKFLOW_STEP_EVENT_NAME, { detail }),
  );
}

/**
 * 批量分发步骤事件
 *
 * 用于初始化或批量同步场景。
 */
export function dispatchWorkflowStepEvents(
  events: WorkflowStepEvent[],
  workspaceId?: string,
): void {
  if (typeof window === "undefined") return;

  const detail: WorkflowStepBatchCustomEventDetail = workspaceId
    ? { workspaceId, events }
    : events;

  window.dispatchEvent(
    new CustomEvent(WORKFLOW_STEP_BATCH_EVENT_NAME, { detail }),
  );
}

// ─── WebSocket 接入点（Story 3.4 预留） ─────────────────────────

/**
 * WebSocket 消息适配器
 *
 * 将 WebSocket 原始消息转换为 WorkflowStepEvent 并处理。
 * Story 3.4 实现 WebSocket 连接后，在 onMessage 回调中调用此函数。
 *
 * @example
 * // Story 3.4 接入示例：
 * // ws.onMessage((msg) => {
 * //   if (msg.type === "workflow.step") {
 * //     adaptWebSocketMessage(workspaceId, msg.payload);
 * //   }
 * // });
 */
export function adaptWebSocketMessage(
  workspaceId: string,
  payload: unknown,
): boolean {
  if (!payload || typeof payload !== "object") return false;

  const record = payload as Record<string, unknown>;
  if (typeof record.step !== "string" || typeof record.status !== "string") {
    return false;
  }

  return handleWorkflowStepEvent(workspaceId, {
    step: record.step,
    status: record.status,
    progress: typeof record.progress === "number" ? record.progress : undefined,
  });
}

type WorkflowStepCustomEventDetail =
  | WorkflowStepEvent
  | {
      workspaceId?: string;
      event: WorkflowStepEvent;
    };

type WorkflowStepBatchCustomEventDetail =
  | WorkflowStepEvent[]
  | {
      workspaceId?: string;
      events: WorkflowStepEvent[];
    };

function resolveStepEvent(
  detail: WorkflowStepCustomEventDetail,
): { workspaceId?: string; event: WorkflowStepEvent } | null {
  if (!detail || typeof detail !== "object") return null;
  if ("event" in detail && detail.event && typeof detail.event === "object") {
    return {
      workspaceId: detail.workspaceId,
      event: detail.event,
    };
  }
  if ("step" in detail && "status" in detail) {
    return { event: detail as WorkflowStepEvent };
  }
  return null;
}

function resolveStepEvents(
  detail: WorkflowStepBatchCustomEventDetail,
): { workspaceId?: string; events: WorkflowStepEvent[] } | null {
  if (!detail || typeof detail !== "object") return null;
  if ("events" in detail && Array.isArray(detail.events)) {
    return {
      workspaceId: detail.workspaceId,
      events: detail.events,
    };
  }
  if (Array.isArray(detail)) {
    return { events: detail };
  }
  return null;
}

/**
 * 订阅浏览器真实事件源（CustomEvent），并同步到步骤 store。
 * 返回取消订阅函数，用于页面卸载清理。
 */
export function subscribeWorkflowStepEvents(workspaceId: string): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onStepEvent = (evt: Event) => {
    const customEvt = evt as CustomEvent<WorkflowStepCustomEventDetail>;
    const resolved = resolveStepEvent(customEvt.detail);
    if (!resolved) return;

    const targetWorkspaceId = resolved.workspaceId ?? workspaceId;
    handleWorkflowStepEvent(targetWorkspaceId, resolved.event);
  };

  const onBatchEvent = (evt: Event) => {
    const customEvt = evt as CustomEvent<WorkflowStepBatchCustomEventDetail>;
    const resolved = resolveStepEvents(customEvt.detail);
    if (!resolved) return;

    const targetWorkspaceId = resolved.workspaceId ?? workspaceId;
    handleWorkflowStepEvents(targetWorkspaceId, resolved.events);
  };

  window.addEventListener(WORKFLOW_STEP_EVENT_NAME, onStepEvent as EventListener);
  window.addEventListener(
    WORKFLOW_STEP_BATCH_EVENT_NAME,
    onBatchEvent as EventListener,
  );

  return () => {
    window.removeEventListener(
      WORKFLOW_STEP_EVENT_NAME,
      onStepEvent as EventListener,
    );
    window.removeEventListener(
      WORKFLOW_STEP_BATCH_EVENT_NAME,
      onBatchEvent as EventListener,
    );
  };
}
