/**
 * 工作流步骤领域模型与状态映射
 *
 * 定义 8 个核心步骤常量、状态枚举和 UI 映射配置。
 * 对齐 ADR-005 `workflow.step` 事件语义：{step, status, progress}
 */

// ─── 步骤状态枚举 ───────────────────────────────────────────────

export type WorkflowStepStatus = "pending" | "in_progress" | "completed";

const VALID_STEP_STATUSES = new Set<WorkflowStepStatus>([
  "pending",
  "in_progress",
  "completed",
]);

// ─── 步骤定义 ───────────────────────────────────────────────────

export interface WorkflowStepDefinition {
  /** 稳定唯一标识，与后端事件 key 对齐 */
  stepId: string;
  /** 排序序号（1-based） */
  order: number;
  /** i18n key，用于 next-intl 读取步骤标签 */
  i18nKey: string;
  /** 默认初始状态 */
  defaultStatus: WorkflowStepStatus;
}

/**
 * 8 个核心工作流步骤（固定顺序，不可按数据缺省少渲染）
 *
 * 步骤 ID 命名与 UX 设计规范中的 Story 状态模型对齐：
 * drafting → ux_design → ui_preview → doc_ready → developing → validating → validated → pr_pending
 */
export const WORKFLOW_STEPS: readonly WorkflowStepDefinition[] = [
  { stepId: "drafting", order: 1, i18nKey: "workflowSteps.steps.drafting", defaultStatus: "pending" },
  { stepId: "ux_design", order: 2, i18nKey: "workflowSteps.steps.uxDesign", defaultStatus: "pending" },
  { stepId: "ui_preview", order: 3, i18nKey: "workflowSteps.steps.uiPreview", defaultStatus: "pending" },
  { stepId: "doc_ready", order: 4, i18nKey: "workflowSteps.steps.docReady", defaultStatus: "pending" },
  { stepId: "developing", order: 5, i18nKey: "workflowSteps.steps.developing", defaultStatus: "pending" },
  { stepId: "validating", order: 6, i18nKey: "workflowSteps.steps.validating", defaultStatus: "pending" },
  { stepId: "validated", order: 7, i18nKey: "workflowSteps.steps.validated", defaultStatus: "pending" },
  { stepId: "pr_pending", order: 8, i18nKey: "workflowSteps.steps.prPending", defaultStatus: "pending" },
] as const;

/** 步骤 ID 联合类型 */
export type WorkflowStepId = (typeof WORKFLOW_STEPS)[number]["stepId"];

/** 所有合法步骤 ID 集合，用于运行时校验 */
export const VALID_STEP_IDS = new Set<string>(
  WORKFLOW_STEPS.map((s) => s.stepId),
);

// ─── 步骤运行时状态 ─────────────────────────────────────────────

export interface WorkflowStepState {
  stepId: WorkflowStepId;
  status: WorkflowStepStatus;
}

// ─── UI 映射配置 ────────────────────────────────────────────────

export interface StepStatusUIConfig {
  /** Lucide 图标名称 */
  icon: "circle" | "loader-2" | "check-circle-2";
  /** Tailwind 颜色类 */
  colorClass: string;
  /** 是否有动画 */
  animate: boolean;
  /** i18n key 用于状态文案 */
  statusI18nKey: string;
}

/**
 * 状态 → UI 映射
 * 颜色 + 图标 + 文字组合，不仅用颜色表达状态（WCAG 合规）
 */
export const STEP_STATUS_UI_MAP: Record<WorkflowStepStatus, StepStatusUIConfig> = {
  pending: {
    icon: "circle",
    colorClass: "text-slate-500",
    animate: false,
    statusI18nKey: "workflowSteps.status.pending",
  },
  in_progress: {
    icon: "loader-2",
    colorClass: "text-blue-500",
    animate: true,
    statusI18nKey: "workflowSteps.status.inProgress",
  },
  completed: {
    icon: "check-circle-2",
    colorClass: "text-green-500",
    animate: false,
    statusI18nKey: "workflowSteps.status.completed",
  },
};

// ─── 工具函数 ────────────────────────────────────────────────────

/**
 * 生成默认步骤状态列表（全部 pending）
 */
export function createDefaultStepStates(): WorkflowStepState[] {
  return WORKFLOW_STEPS.map((step) => ({
    stepId: step.stepId,
    status: step.defaultStatus,
  }));
}

/**
 * 校验步骤 ID 是否合法
 */
export function isValidStepId(id: string): id is WorkflowStepId {
  return VALID_STEP_IDS.has(id);
}

/**
 * 校验步骤状态是否为合法三态之一
 */
export function isValidStepStatus(status: unknown): status is WorkflowStepStatus {
  return typeof status === "string" && VALID_STEP_STATUSES.has(status as WorkflowStepStatus);
}

/**
 * 一致性收敛：确保当前步骤不落在已完成步骤之前
 *
 * 规则：
 * - 当前步骤之前的所有步骤应为 completed
 * - 当前步骤之后的所有步骤不应为 completed（除非已完成）
 * - 如果检测到冲突，自动修正
 */
export function reconcileStepStates(
  steps: WorkflowStepState[],
  currentStepId: WorkflowStepId | null,
): WorkflowStepState[] {
  if (!currentStepId) return steps;

  const currentIndex = WORKFLOW_STEPS.findIndex(
    (s) => s.stepId === currentStepId,
  );
  if (currentIndex === -1) return steps;

  return steps.map((step, index) => {
    if (index < currentIndex && step.status !== "completed") {
      // 当前步骤之前的步骤应为 completed
      return { ...step, status: "completed" as const };
    }
    if (index === currentIndex && step.status === "pending") {
      // 当前步骤至少应为 in_progress
      return { ...step, status: "in_progress" as const };
    }
    if (index > currentIndex && step.status === "completed") {
      // 当前步骤之后的步骤不能提前为 completed
      return { ...step, status: "pending" as const };
    }
    return step;
  });
}
