"use client";

/**
 * 工作流步骤面板组件
 *
 * 渲染 8 个核心步骤及状态图标（待执行/进行中/已完成）。
 * 当前步骤高亮显示，已完成步骤显示勾选标记。
 * 满足键盘可达、语义标签与可访问属性。
 */

import { Circle, Loader2, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import {
  type WorkflowStepState,
  type WorkflowStepId,
  type WorkflowStepStatus,
  WORKFLOW_STEPS,
  STEP_STATUS_UI_MAP,
} from "@/lib/workflow/workflow-steps";

// ─── 图标映射 ────────────────────────────────────────────────────

const ICON_MAP = {
  circle: Circle,
  "loader-2": Loader2,
  "check-circle-2": CheckCircle2,
} as const;

// ─── Props ──────────────────────────────────────────────────────

interface WorkflowStepsPanelProps {
  /** 步骤状态列表 */
  steps: WorkflowStepState[];
  /** 当前活跃步骤 ID */
  currentStepId: WorkflowStepId | null;
}

// ─── 组件 ───────────────────────────────────────────────────────

export function WorkflowStepsPanel({
  steps,
  currentStepId,
}: WorkflowStepsPanelProps) {
  const t = useTranslations("workflowSteps");

  // 构建 stepId → status 映射
  const statusMap = new Map<string, WorkflowStepStatus>(
    steps.map((s) => [s.stepId, s.status]),
  );

  return (
    <nav
      aria-label={t("panelTitle")}
      data-testid="workflow-steps-panel"
    >
      <h2 className="text-sm font-medium text-foreground mb-3">
        {t("panelTitle")}
      </h2>
      <ol className="space-y-1" role="list">
        {WORKFLOW_STEPS.map((stepDef) => {
          const status = statusMap.get(stepDef.stepId) ?? "pending";
          const isCurrent = stepDef.stepId === currentStepId;
          const uiConfig = STEP_STATUS_UI_MAP[status];
          const IconComponent = ICON_MAP[uiConfig.icon];

          return (
            <li
              key={stepDef.stepId}
              role="listitem"
              aria-current={isCurrent ? "step" : undefined}
              data-testid={`workflow-step-${stepDef.stepId}`}
              data-step-status={status}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
                isCurrent
                  ? "bg-accent border border-border font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {/* 状态图标 */}
              <span
                className={cn("shrink-0", uiConfig.colorClass)}
                aria-hidden="true"
              >
                <IconComponent
                  className={cn(
                    "size-4",
                    uiConfig.animate && "animate-spin",
                  )}
                />
              </span>

              {/* 步骤标签 */}
              <span className="flex-1 truncate">
                {t(stepDef.i18nKey.replace("workflowSteps.", ""))}
              </span>

              {/* 屏幕阅读器状态播报 */}
              <span className="sr-only">
                {t("stepLabel", {
                  order: stepDef.order,
                  total: WORKFLOW_STEPS.length,
                })}
                {" — "}
                {t(uiConfig.statusI18nKey.replace("workflowSteps.", ""))}
              </span>
            </li>
          );
        })}
      </ol>

      {/* 状态变化播报区域 */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="workflow-steps-live-region"
      >
        {currentStepId && (
          <span>
            {t(
              `steps.${WORKFLOW_STEPS.find((s) => s.stepId === currentStepId)?.stepId ?? "drafting"}` as Parameters<typeof t>[0],
            )}
            {" — "}
            {t("status.inProgress")}
          </span>
        )}
      </div>
    </nav>
  );
}
