/**
 * 中间对话状态持久化 Store
 *
 * 使用 Zustand + persist 中间件，按 workspaceId 隔离持久化。
 * 对齐 ADR-004 "状态可持久化/可恢复"原则。
 * 对齐 workflow-steps-store / workflow-story-tree-store 的设计模式。
 *
 * 提供 appendMessage、appendInFlowUpdate、startStreaming、
 * appendStreamingDelta、completeStreaming、toggleThinkingCollapse 等原子操作。
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  type ConversationMessage,
  type InFlowMapping,
  type StreamingState,
  type ThinkingState,
  createAiMessage,
  createInFlowMessage,
  createSystemMessage,
  createUserMessage,
  isValidMessage,
  sortMessages,
} from "./workflow-conversation";

// ─── Store 版本 ─────────────────────────────────────────────────

const STORE_VERSION = 1;

/** 最大持久化消息数量，防止 localStorage 溢出 */
const MAX_PERSISTED_MESSAGES = 200;

// ─── 单个工作空间的对话数据 ──────────────────────────────────────

export interface WorkspaceConversationData {
  /** 消息列表（按 createdAt + sequence 排序） */
  messages: ConversationMessage[];
  /** 是否显示恢复提示 */
  recoveryHintVisible: boolean;
  /** 数据版本（用于迁移） */
  version: number;
}

// ─── Store 接口 ─────────────────────────────────────────────────

interface ConversationStore {
  /** 按 workspaceId 隔离的对话数据 */
  workspaces: Record<string, WorkspaceConversationData>;

  /** 获取指定工作空间的消息列表（不存在则返回空数组） */
  getMessages: (workspaceId: string) => ConversationMessage[];

  /** 追加用户消息 */
  appendMessage: (workspaceId: string, id: string, content: string) => void;

  /** 追加系统消息 */
  appendSystemMessage: (workspaceId: string, id: string, content: string) => void;

  /** 追加 In-flow 更新消息（从事件映射生成） */
  appendInFlowUpdate: (workspaceId: string, id: string, mapping: InFlowMapping) => void;

  /** 开始 AI 流式输出（创建新的 AI 消息并标记为 streaming） */
  startStreaming: (workspaceId: string, messageId: string) => void;

  /** 追加流式输出增量内容（delta） */
  appendStreamingDelta: (workspaceId: string, messageId: string, delta: string) => void;

  /** 完成流式输出（标记 AI 消息为 complete） */
  completeStreaming: (
    workspaceId: string,
    messageId: string,
    thinkingContent?: string,
  ) => void;

  /** 切换思考过程折叠状态 */
  toggleThinkingCollapse: (workspaceId: string, messageId: string) => void;

  /** 重置指定工作空间的对话 */
  resetWorkspace: (workspaceId: string) => void;
}

// ─── 内部工具函数 ────────────────────────────────────────────────

function createDefaultConversationData(): WorkspaceConversationData {
  return {
    messages: [],
    recoveryHintVisible: false,
    version: STORE_VERSION,
  };
}

export function getOrCreateConversationData(
  workspaces: Record<string, WorkspaceConversationData>,
  workspaceId: string,
): WorkspaceConversationData {
  const existing = workspaces[workspaceId];
  if (existing) {
    const sanitized = sanitizeConversationData(existing);
    if (sanitized) return sanitized;
  }
  return {
    ...createDefaultConversationData(),
    recoveryHintVisible: Boolean(existing),
  };
}

/**
 * 数据完整性校验与修复
 *
 * 数据损坏或版本不兼容时回退安全默认值。
 */
function sanitizeConversationData(
  data: WorkspaceConversationData,
): WorkspaceConversationData | null {
  if (data.version !== STORE_VERSION) return null;
  if (!Array.isArray(data.messages)) return null;

  // 过滤掉无效消息，保留有效的
  const validMessages = data.messages.filter(isValidMessage);
  const droppedCount = data.messages.length - validMessages.length;

  // 如果所有消息都无效，返回空列表（可恢复降级）
  return {
    messages: sortMessages(validMessages),
    recoveryHintVisible:
      droppedCount > 0
        ? true
        : typeof data.recoveryHintVisible === "boolean"
          ? data.recoveryHintVisible
          : false,
    version: STORE_VERSION,
  };
}

/**
 * 更新单条消息（按 ID 查找并替换）
 */
function updateMessageById(
  messages: ConversationMessage[],
  messageId: string,
  updater: (msg: ConversationMessage) => ConversationMessage,
): ConversationMessage[] {
  return messages.map((msg) =>
    msg.id === messageId ? updater(msg) : msg,
  );
}

/**
 * 裁剪消息列表，确保不超过最大持久化数量
 */
function trimMessages(
  messages: ConversationMessage[],
): ConversationMessage[] {
  if (messages.length <= MAX_PERSISTED_MESSAGES) return messages;
  return messages.slice(messages.length - MAX_PERSISTED_MESSAGES);
}

// ─── Store 实现 ─────────────────────────────────────────────────

export const useConversationStore = create<ConversationStore>()(
  persist(
    (set, get) => ({
      workspaces: {},

      getMessages: (workspaceId: string) => {
        const data = getOrCreateConversationData(
          get().workspaces,
          workspaceId,
        );
        return data.messages;
      },

      appendMessage: (workspaceId, id, content) => {
        set((state) => {
          const data = getOrCreateConversationData(
            state.workspaces,
            workspaceId,
          );
          const message = createUserMessage(id, content);
          const messages = trimMessages(
            sortMessages([...data.messages, message]),
          );

          return {
            workspaces: {
              ...state.workspaces,
              [workspaceId]: { ...data, messages, recoveryHintVisible: false },
            },
          };
        });
      },

      appendSystemMessage: (workspaceId, id, content) => {
        set((state) => {
          const data = getOrCreateConversationData(
            state.workspaces,
            workspaceId,
          );
          const message = createSystemMessage(id, content);
          const messages = trimMessages(
            sortMessages([...data.messages, message]),
          );

          return {
            workspaces: {
              ...state.workspaces,
              [workspaceId]: { ...data, messages, recoveryHintVisible: false },
            },
          };
        });
      },

      appendInFlowUpdate: (workspaceId, id, mapping) => {
        set((state) => {
          const data = getOrCreateConversationData(
            state.workspaces,
            workspaceId,
          );
          const message = createInFlowMessage(id, mapping);
          const messages = trimMessages(
            sortMessages([...data.messages, message]),
          );

          return {
            workspaces: {
              ...state.workspaces,
              [workspaceId]: { ...data, messages, recoveryHintVisible: false },
            },
          };
        });
      },

      startStreaming: (workspaceId, messageId) => {
        set((state) => {
          const data = getOrCreateConversationData(
            state.workspaces,
            workspaceId,
          );
          const aiMessage = createAiMessage(messageId);
          const messages = sortMessages([...data.messages, aiMessage]);

          return {
            workspaces: {
              ...state.workspaces,
              [workspaceId]: { ...data, messages, recoveryHintVisible: false },
            },
          };
        });
      },

      appendStreamingDelta: (workspaceId, messageId, delta) => {
        set((state) => {
          const data = getOrCreateConversationData(
            state.workspaces,
            workspaceId,
          );
          const messages = updateMessageById(
            data.messages,
            messageId,
            (msg) => ({
              ...msg,
              content: msg.content + delta,
            }),
          );

          return {
            workspaces: {
              ...state.workspaces,
              [workspaceId]: { ...data, messages, recoveryHintVisible: false },
            },
          };
        });
      },

      completeStreaming: (workspaceId, messageId, thinkingContent) => {
        set((state) => {
          const data = getOrCreateConversationData(
            state.workspaces,
            workspaceId,
          );
          const messages = updateMessageById(
            data.messages,
            messageId,
            (msg) => ({
              ...msg,
              streamingState: "complete" as StreamingState,
              thinkingContent: thinkingContent ?? null,
              thinkingState: thinkingContent
                ? ("collapsed" as ThinkingState)
                : ("hidden" as ThinkingState),
            }),
          );

          return {
            workspaces: {
              ...state.workspaces,
              [workspaceId]: { ...data, messages, recoveryHintVisible: false },
            },
          };
        });
      },

      toggleThinkingCollapse: (workspaceId, messageId) => {
        set((state) => {
          const data = getOrCreateConversationData(
            state.workspaces,
            workspaceId,
          );
          const messages = updateMessageById(
            data.messages,
            messageId,
            (msg) => {
              // 只有 complete 状态且有思考内容时才允许切换
              if (
                msg.streamingState !== "complete" ||
                !msg.thinkingContent
              ) {
                return msg;
              }
              const newThinkingState: ThinkingState =
                msg.thinkingState === "collapsed" ? "visible" : "collapsed";
              return { ...msg, thinkingState: newThinkingState };
            },
          );

          return {
            workspaces: {
              ...state.workspaces,
              [workspaceId]: { ...data, messages, recoveryHintVisible: false },
            },
          };
        });
      },

      resetWorkspace: (workspaceId) => {
        set((state) => ({
          workspaces: {
            ...state.workspaces,
            [workspaceId]: createDefaultConversationData(),
          },
        }));
      },
    }),
    {
      name: "ai-builder-conversation",
      // 仅持久化 workspaces 数据，方法不需要持久化
      // partialize 排除临时 UI 状态（streaming 进行中的不完整内容）
      partialize: (state) => ({
        workspaces: Object.fromEntries(
          Object.entries(state.workspaces).map(([wsId, data]) => [
            wsId,
            {
              ...data,
              // 持久化时将 streaming 状态的消息标记为 complete（避免恢复后卡在 streaming）
              messages: trimMessages(
                data.messages.map((msg) =>
                  msg.streamingState === "streaming"
                    ? { ...msg, streamingState: "complete" as StreamingState }
                    : msg,
                ),
              ),
            },
          ]),
        ),
      }),
    },
  ),
);
