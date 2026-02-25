"use client";

/**
 * 中间对话流面板组件
 *
 * 渲染消息流、时间戳、消息类型样式与空态。
 * 对话容器使用 role="log" aria-live="polite" 满足可访问性要求。
 * 流式内容区域设置 aria-atomic="false" 仅播报新增内容。
 */

import { useRef, useEffect, useCallback } from "react";
import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import type { ConversationMessage } from "@/lib/workflow/workflow-conversation";
import { ConversationMessageItem } from "./ConversationMessageItem";

interface ConversationStreamPanelProps {
  /** 消息列表（已排序） */
  messages: ConversationMessage[];
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 是否显示恢复提示 */
  recoveryHintVisible?: boolean;
  /** 切换思考过程折叠回调 */
  onToggleThinking: (messageId: string) => void;
}

export function ConversationStreamPanel({
  messages,
  isLoading = false,
  recoveryHintVisible = false,
  onToggleThinking,
}: ConversationStreamPanelProps) {
  const t = useTranslations("conversation");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoScrollEnabled = useRef(true);
  const lastMessage = messages[messages.length - 1] ?? null;

  // 自动滚动到底部（新消息到达时）
  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current || !isAutoScrollEnabled.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  // 检测用户是否手动滚动（离底部超过 100px 则暂停自动滚动）
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    isAutoScrollEnabled.current = distanceFromBottom < 100;
  }, []);

  // 消息变化时自动滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, lastMessage?.id, lastMessage?.content, scrollToBottom]);

  // 加载态
  if (isLoading) {
    return (
      <div
        className="flex flex-1 flex-col gap-3 p-4"
        data-testid="conversation-loading"
      >
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-12 w-5/6" />
      </div>
    );
  }

  // 空态
  if (messages.length === 0) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center gap-3 p-4"
        data-testid="conversation-empty"
      >
        <MessageSquare className="size-10 text-muted-foreground/50" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          {t("emptyState")}
        </p>
      </div>
    );
  }

  // 消息列表
  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      role="log"
      aria-live="polite"
      aria-atomic="false"
      aria-label={t("panelLabel")}
      className="flex flex-1 flex-col overflow-y-auto p-4"
      data-testid="conversation-stream-panel"
    >
      {recoveryHintVisible ? (
        <p
          className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
          data-testid="conversation-recovery-notice"
        >
          {t("recoveryHint")}
        </p>
      ) : null}
      <div className="space-y-1">
        {messages.map((message) => (
          <ConversationMessageItem
            key={message.id}
            message={message}
            onToggleThinking={onToggleThinking}
          />
        ))}
      </div>
    </div>
  );
}
