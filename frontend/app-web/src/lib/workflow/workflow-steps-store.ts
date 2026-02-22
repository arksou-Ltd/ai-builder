/**
 * 工作流步骤状态持久化 Store
 *
 * 使用 Zustand + persist 中间件，按 workspaceId 隔离持久化。
 * 对齐 ADR-004 "状态可持久化/可恢复"原则。
 *
 * 一致性规则：
 * - 完成步骤集合与当前步骤冲突时自动收敛
 * - 数据损坏或版本不兼容时回退到默认步骤状态
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  type WorkflowStepId,
  type WorkflowStepState,
  type WorkflowStepStatus,
  WORKFLOW_STEPS,
  createDefaultStepStates,
  isValidStepId,
  isValidStepStatus,
  reconcileStepStates,
} from "./workflow-steps";

// ─── Store 版本（用于数据迁移） ──────────────────────────────────

const STORE_VERSION = 1;

// ─── 单个工作空间的步骤数据 ──────────────────────────────────────

export interface WorkspaceWorkflowData {
  steps: WorkflowStepState[];
  currentStepId: WorkflowStepId | null;
  version: number;
}

// ─── Store 接口 ─────────────────────────────────────────────────

interface WorkflowStepsStore {
  /** 按 workspaceId 隔离的步骤数据 */
  workspaces: Record<string, WorkspaceWorkflowData>;

  /** 获取指定工作空间的步骤状态（不存在则返回默认值） */
  getSteps: (workspaceId: string) => WorkflowStepState[];

  /** 获取指定工作空间的当前步骤 ID */
  getCurrentStepId: (workspaceId: string) => WorkflowStepId | null;

  /** 更新单个步骤状态 */
  updateStepStatus: (
    workspaceId: string,
    stepId: WorkflowStepId,
    status: WorkflowStepStatus,
  ) => void;

  /** 设置当前步骤（同时自动收敛前序步骤为 completed） */
  setCurrentStep: (
    workspaceId: string,
    stepId: WorkflowStepId | null,
  ) => void;

  /** 批量更新步骤状态（用于事件适配层） */
  batchUpdateSteps: (
    workspaceId: string,
    updates: Array<{ stepId: WorkflowStepId; status: WorkflowStepStatus }>,
  ) => void;

  /** 重置指定工作空间的步骤状态 */
  resetWorkspace: (workspaceId: string) => void;
}

// ─── 内部工具函数 ────────────────────────────────────────────────

export function getOrCreateWorkspaceData(
  workspaces: Record<string, WorkspaceWorkflowData>,
  workspaceId: string,
): WorkspaceWorkflowData {
  const existing = workspaces[workspaceId];
  if (existing) {
    const sanitized = sanitizeWorkspaceWorkflowData(existing);
    if (sanitized) return sanitized;
  }

  return {
    steps: createDefaultStepStates(),
    currentStepId: null,
    version: STORE_VERSION,
  };
}

function sanitizeWorkspaceWorkflowData(
  existing: WorkspaceWorkflowData,
): WorkspaceWorkflowData | null {
  if (existing.version !== STORE_VERSION) return null;
  if (existing.steps.length !== WORKFLOW_STEPS.length) return null;

  const statusMap = new Map<WorkflowStepId, WorkflowStepStatus>();

  for (const step of existing.steps) {
    if (!isValidStepId(step.stepId) || !isValidStepStatus(step.status)) {
      return null;
    }
    if (statusMap.has(step.stepId)) {
      return null;
    }
    statusMap.set(step.stepId, step.status);
  }

  if (statusMap.size !== WORKFLOW_STEPS.length) return null;
  const currentStepValid =
    existing.currentStepId === null || isValidStepId(existing.currentStepId);
  if (!currentStepValid) return null;

  const normalizedSteps: WorkflowStepState[] = WORKFLOW_STEPS.map((stepDef) => ({
    stepId: stepDef.stepId,
    status: statusMap.get(stepDef.stepId) ?? stepDef.defaultStatus,
  }));

  return {
    ...existing,
    steps: reconcileStepStates(normalizedSteps, existing.currentStepId),
  };
}

// ─── Store 实现 ─────────────────────────────────────────────────

export const useWorkflowStepsStore = create<WorkflowStepsStore>()(
  persist(
    (set, get) => ({
      workspaces: {},

      getSteps: (workspaceId: string) => {
        const data = getOrCreateWorkspaceData(get().workspaces, workspaceId);
        return data.steps;
      },

      getCurrentStepId: (workspaceId: string) => {
        const data = getOrCreateWorkspaceData(get().workspaces, workspaceId);
        return data.currentStepId;
      },

      updateStepStatus: (workspaceId, stepId, status) => {
        set((state) => {
          const data = getOrCreateWorkspaceData(state.workspaces, workspaceId);
          const updatedSteps = data.steps.map((step) =>
            step.stepId === stepId ? { ...step, status } : step,
          );

          return {
            workspaces: {
              ...state.workspaces,
              [workspaceId]: {
                ...data,
                steps: reconcileStepStates(updatedSteps, data.currentStepId),
              },
            },
          };
        });
      },

      setCurrentStep: (workspaceId, stepId) => {
        set((state) => {
          const data = getOrCreateWorkspaceData(state.workspaces, workspaceId);

          if (stepId === null) {
            return {
              workspaces: {
                ...state.workspaces,
                [workspaceId]: {
                  ...data,
                  currentStepId: null,
                  steps: reconcileStepStates(data.steps, null),
                },
              },
            };
          }

          const updatedSteps = data.steps.map((step) =>
            step.stepId === stepId
              ? { ...step, status: "in_progress" as const }
              : step,
          );

          return {
            workspaces: {
              ...state.workspaces,
              [workspaceId]: {
                ...data,
                currentStepId: stepId,
                steps: reconcileStepStates(updatedSteps, stepId),
              },
            },
          };
        });
      },

      batchUpdateSteps: (workspaceId, updates) => {
        set((state) => {
          const data = getOrCreateWorkspaceData(state.workspaces, workspaceId);
          const updateMap = new Map(updates.map((u) => [u.stepId, u.status]));

          const updatedSteps = data.steps.map((step) => {
            const newStatus = updateMap.get(step.stepId);
            return newStatus ? { ...step, status: newStatus } : step;
          });

          return {
            workspaces: {
              ...state.workspaces,
              [workspaceId]: {
                ...data,
                steps: reconcileStepStates(updatedSteps, data.currentStepId),
              },
            },
          };
        });
      },

      resetWorkspace: (workspaceId) => {
        set((state) => ({
          workspaces: {
            ...state.workspaces,
            [workspaceId]: {
              steps: createDefaultStepStates(),
              currentStepId: null,
              version: STORE_VERSION,
            },
          },
        }));
      },
    }),
    {
      name: "ai-builder-workflow-steps",
      // 仅持久化 workspaces 数据，方法不需要持久化
      partialize: (state) => ({ workspaces: state.workspaces }),
    },
  ),
);
