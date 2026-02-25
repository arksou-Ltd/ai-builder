"use client";

/**
 * 对话消息项组件
 *
 * 区分 user / ai / system / in_flow_update 四种消息类型的呈现。
 * AI 消息支持流式增量渲染与思考过程折叠。
 * 错误消息使用 role="alert" 满足可访问性要求。
 */

import { Bot, User, Info, AlertTriangle, AlertCircle, Activity } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { ConversationMessage, InFlowSeverity } from "@/lib/workflow/workflow-conversation";
import { ThinkingProcess } from "./ThinkingProcess";

interface ConversationMessageItemProps {
  /** 消息数据 */
  message: ConversationMessage;
  /** 切换思考过程折叠回调 */
  onToggleThinking: (messageId: string) => void;
}

// ─── 严重级别图标映射 ──────────────────────────────────────────

const SEVERITY_ICON_MAP: Record<InFlowSeverity, typeof Info> = {
  info: Info,
  warn: AlertTriangle,
  error: AlertCircle,
};

const SEVERITY_COLOR_MAP: Record<InFlowSeverity, string> = {
  info: "text-blue-500 bg-blue-50 border-blue-200",
  warn: "text-amber-600 bg-amber-50 border-amber-200",
  error: "text-red-600 bg-red-50 border-red-200",
};

// ─── 组件 ───────────────────────────────────────────────────────

export function ConversationMessageItem({
  message,
  onToggleThinking,
}: ConversationMessageItemProps) {
  const t = useTranslations("conversation");

  const resolveErrorGuidance = (rawMessage: string) => {
    const normalized = rawMessage.toLowerCase();
    if (
      normalized.includes("config") ||
      normalized.includes("setting") ||
      normalized.includes("permission")
    ) {
      return `${t("error.blocked")} (${t("error.settingsAction")})`;
    }
    if (normalized.includes("context")) {
      return `${t("error.needsContext")} (${t("error.retryAction")})`;
    }
    return `${t("error.recoverable")} (${t("error.retryAction")})`;
  };

  switch (message.kind) {
    case "user":
      return (
        <div
          className="flex gap-3 py-3"
          data-testid={`message-${message.id}`}
          data-message-kind="user"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <User className="size-4 text-primary" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {t("userLabel")}
            </p>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </div>
        </div>
      );

    case "ai":
      return (
        <div
          className="flex gap-3 py-3"
          data-testid={`message-${message.id}`}
          data-message-kind="ai"
          data-streaming-state={message.streamingState}
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-100">
            <Bot className="size-4 text-violet-600" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {t("aiLabel")}
              {message.streamingState === "streaming" && (
                <span className="ml-2 inline-flex items-center gap-1 text-blue-500">
                  <Activity className="size-3 animate-pulse" aria-hidden="true" />
                  <span className="text-[10px]">{t("streaming")}</span>
                </span>
              )}
            </p>
            <div
              className="text-sm text-foreground whitespace-pre-wrap break-words"
              aria-atomic="false"
            >
              {message.content || (
                <span className="text-muted-foreground italic">
                  {t("aiThinking")}
                </span>
              )}
            </div>

            {/* 思考过程 */}
            <ThinkingProcess
              content={message.thinkingContent}
              thinkingState={message.thinkingState}
              streamingState={message.streamingState}
              onToggle={() => onToggleThinking(message.id)}
            />
          </div>
        </div>
      );

    case "system":
      return (
        <div
          className="flex items-start gap-2 py-2 px-3 rounded-md bg-muted/50 border border-border/50"
          data-testid={`message-${message.id}`}
          data-message-kind="system"
        >
          <Info className="size-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">
            {message.content}
          </p>
        </div>
      );

    case "in_flow_update": {
      const severity = message.severity ?? "info";
      const SeverityIcon = SEVERITY_ICON_MAP[severity];
      const colorClasses = SEVERITY_COLOR_MAP[severity];
      const isError = severity === "error";

      return (
        <div
          className={cn(
            "flex items-start gap-2 py-2 px-3 rounded-md border text-xs",
            colorClasses,
          )}
          data-testid={`message-${message.id}`}
          data-message-kind="in_flow_update"
          data-severity={severity}
          role={isError ? "alert" : undefined}
          aria-live={isError ? "assertive" : undefined}
        >
          <SeverityIcon className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="flex-1">
            {message.content}
          </p>
          {isError ? (
            <p className="w-full text-[11px] mt-1">
              {resolveErrorGuidance(message.content)}
            </p>
          ) : null}
        </div>
      );
    }

    default:
      return null;
  }
}
