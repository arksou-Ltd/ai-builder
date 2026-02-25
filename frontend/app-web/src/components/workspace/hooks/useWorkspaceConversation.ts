/**
 * 工作空间对话状态 Hook
 *
 * 从 Zustand store 读取指定 workspaceId 的对话消息，
 * 并提供思考过程切换回调。
 */

import { useMemo, useCallback } from "react";

import {
  getOrCreateConversationData,
  useConversationStore,
} from "@/lib/workflow/workflow-conversation-store";
import type { ConversationMessage } from "@/lib/workflow/workflow-conversation";

export interface UseWorkspaceConversationResult {
  /** 已排序的消息列表 */
  messages: ConversationMessage[];
  /** 是否展示恢复提示 */
  recoveryHintVisible: boolean;
  /** 切换思考过程折叠回调 */
  toggleThinking: (messageId: string) => void;
}

export function useWorkspaceConversation(
  workspaceId: string,
): UseWorkspaceConversationResult {
  const workspaces = useConversationStore((state) => state.workspaces);
  const toggleThinkingAction = useConversationStore(
    (state) => state.toggleThinkingCollapse,
  );

  const messages = useMemo(() => {
    const data = getOrCreateConversationData(workspaces, workspaceId);
    return data.messages;
  }, [workspaces, workspaceId]);

  const recoveryHintVisible = useMemo(() => {
    const data = getOrCreateConversationData(workspaces, workspaceId);
    return data.recoveryHintVisible;
  }, [workspaces, workspaceId]);

  const toggleThinking = useCallback(
    (messageId: string) => {
      toggleThinkingAction(workspaceId, messageId);
    },
    [toggleThinkingAction, workspaceId],
  );

  return {
    messages,
    recoveryHintVisible,
    toggleThinking,
  };
}
