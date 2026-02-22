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
  reconcileStepStates,
} from "./workflow-steps";

// ─── Store 版本（用于数据迁移） ──────────────────────────────────

const STORE_VERSION = 1;

// ─── 单个工作空间的步骤数据 ──────────────────────────────────────

interface WorkspaceWorkflowData {
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
  setCurrentStep: (workspaceId: string, stepId: WorkflowStepId) => void;

  /** 批量更新步骤状态（用于事件适配层） */
  batchUpdateSteps: (
    workspaceId: string,
    updates: Array<{ stepId: WorkflowStepId; status: WorkflowStepStatus }>,
  ) => void;

  /** 重置指定工作空间的步骤状态 */
  resetWorkspace: (workspaceId: string) => void;
}

// ─── 内部工具函数 ────────────────────────────────────────────────

function getOrCreateWorkspaceData(
  workspaces: Record<string, WorkspaceWorkflowData>,
  workspaceId: string,
): WorkspaceWorkflowData {
  const existing = workspaces[workspaceId];

  // 版本不兼容或数据损坏时回退到默认状态
  if (existing && existing.version === STORE_VERSION && existing.steps.length === WORKFLOW_STEPS.length) {
    // 校验所有 stepId 是否合法
    const allValid = existing.steps.every((s) => isValidStepId(s.stepId));
    if (allValid) return existing;
  }

  return {
    steps: createDefaultStepStates(),
    currentStepId: null,
    version: STORE_VERSION,
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
