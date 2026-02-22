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
  isValidStepId,
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

// ─── 合法状态集合 ────────────────────────────────────────────────

const VALID_STATUSES = new Set<string>(["pending", "in_progress", "completed"]);

function isValidStatus(status: string): status is WorkflowStepStatus {
  return VALID_STATUSES.has(status);
}

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
  if (!isValidStepId(event.step) || !isValidStatus(event.status)) {
    return false;
  }

  const store = useWorkflowStepsStore.getState();
  const stepId = event.step as WorkflowStepId;
  const status = event.status as WorkflowStepStatus;

  // 如果步骤变为 in_progress，同时设置为当前步骤
  if (status === "in_progress") {
    store.setCurrentStep(workspaceId, stepId);
  } else {
    store.updateStepStatus(workspaceId, stepId, status);
  }

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
    if (isValidStepId(event.step) && isValidStatus(event.status)) {
      validUpdates.push({
        stepId: event.step as WorkflowStepId,
        status: event.status as WorkflowStepStatus,
      });
      if (event.status === "in_progress") {
        currentStepId = event.step as WorkflowStepId;
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
