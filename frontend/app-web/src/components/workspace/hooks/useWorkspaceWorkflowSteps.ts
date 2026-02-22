"use client";

/**
 * 工作空间工作流步骤 Hook
 *
 * 统一组织步骤数据与当前步骤，从 Zustand store 读取并提供给组件。
 * 页面初始化时恢复缓存状态。
 */

import { useMemo } from "react";

import { useWorkflowStepsStore } from "@/lib/workflow/workflow-steps-store";
import type { WorkflowStepId, WorkflowStepState } from "@/lib/workflow/workflow-steps";

interface UseWorkspaceWorkflowStepsReturn {
  /** 8 个步骤的当前状态 */
  steps: WorkflowStepState[];
  /** 当前活跃步骤 ID */
  currentStepId: WorkflowStepId | null;
}

/**
 * 获取指定工作空间的工作流步骤状态
 *
 * 从持久化 store 恢复状态，页面刷新后自动恢复。
 */
export function useWorkspaceWorkflowSteps(
  workspaceId: string,
): UseWorkspaceWorkflowStepsReturn {
  const getSteps = useWorkflowStepsStore((state) => state.getSteps);
  const getCurrentStepId = useWorkflowStepsStore((state) => state.getCurrentStepId);

  const steps = useMemo(() => getSteps(workspaceId), [getSteps, workspaceId]);
  const currentStepId = useMemo(
    () => getCurrentStepId(workspaceId),
    [getCurrentStepId, workspaceId],
  );

  return { steps, currentStepId };
}
