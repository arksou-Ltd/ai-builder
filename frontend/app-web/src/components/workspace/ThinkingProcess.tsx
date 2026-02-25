"use client";

/**
 * AI 思考过程展示组件
 *
 * 规则：
 * - streaming 进行中不可折叠（强制展示）
 * - streaming 完成后可折叠
 * - 无思考内容时不渲染
 */

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { StreamingState, ThinkingState } from "@/lib/workflow/workflow-conversation";

interface ThinkingProcessProps {
  /** 思考过程内容 */
  content: string | null;
  /** 思考过程展示状态 */
  thinkingState: ThinkingState;
  /** 流式状态 */
  streamingState: StreamingState;
  /** 切换折叠回调 */
  onToggle: () => void;
}

export function ThinkingProcess({
  content,
  thinkingState,
  streamingState,
  onToggle,
}: ThinkingProcessProps) {
  const t = useTranslations("conversation");

  // 无思考内容时不渲染
  if (!content && thinkingState === "hidden") return null;

  // streaming 进行中：强制展示，不可折叠
  const isStreaming = streamingState === "streaming";
  const isExpanded = isStreaming || thinkingState === "visible";

  return (
    <div
      className="mt-2 rounded-md border border-border/50 bg-muted/30"
      data-testid="thinking-process"
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={isStreaming}
        aria-expanded={isExpanded}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          !isStreaming && "hover:text-foreground cursor-pointer",
          isStreaming && "cursor-default opacity-70",
        )}
        data-testid="thinking-process-toggle"
      >
        <ChevronDown
          className={cn(
            "size-3 transition-transform duration-200",
            !isExpanded && "-rotate-90",
          )}
          aria-hidden="true"
        />
        <span>
          {isStreaming
            ? t("thinkingInProgress")
            : t("thinkingComplete")}
        </span>
      </button>

      {isExpanded && content && (
        <div
          className="border-t border-border/50 px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap"
          data-testid="thinking-process-content"
        >
          {content}
        </div>
      )}
    </div>
  );
}
