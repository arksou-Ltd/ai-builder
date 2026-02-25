/**
 * 中间对话域模型与消息协议
 *
 * 定义 ConversationMessage、MessageKind、StreamingState、ThinkingState 等类型。
 * 对齐 ADR-005 事件语义，复用 workflow.step / workflow.story.status 事件。
 * 排序键：createdAt + sequence，保证追加顺序稳定且跨刷新可恢复。
 */

// ─── 消息类型枚举 ───────────────────────────────────────────────

export type MessageKind = "user" | "ai" | "system" | "in_flow_update";

const VALID_MESSAGE_KINDS = new Set<MessageKind>([
  "user",
  "ai",
  "system",
  "in_flow_update",
]);

// ─── 流式状态 ───────────────────────────────────────────────────

export type StreamingState = "idle" | "streaming" | "complete";

const VALID_STREAMING_STATES = new Set<StreamingState>([
  "idle",
  "streaming",
  "complete",
]);

// ─── 思考过程状态 ───────────────────────────────────────────────

export type ThinkingState = "hidden" | "visible" | "collapsed";

const VALID_THINKING_STATES = new Set<ThinkingState>([
  "hidden",
  "visible",
  "collapsed",
]);

// ─── In-flow 严重级别 ──────────────────────────────────────────

export type InFlowSeverity = "info" | "warn" | "error";

const VALID_SEVERITIES = new Set<InFlowSeverity>(["info", "warn", "error"]);

// ─── 消息模型 ──────────────────────────────────────────────────

export interface ConversationMessage {
  /** 消息唯一标识 */
  id: string;
  /** 消息类型 */
  kind: MessageKind;
  /** 消息文本内容 */
  content: string;
  /** 创建时间戳（UTC ms） */
  createdAt: number;
  /** 序列号（同一毫秒内的排序依据） */
  sequence: number;
  /** 流式状态（仅 ai 消息使用） */
  streamingState: StreamingState;
  /** 思考过程内容（仅 ai 消息使用） */
  thinkingContent: string | null;
  /** 思考过程展示状态（仅 ai 消息使用） */
  thinkingState: ThinkingState;
  /** In-flow 严重级别（仅 in_flow_update 消息使用） */
  severity: InFlowSeverity | null;
  /** In-flow 来源事件类型（如 workflow.step / workflow.story.status） */
  sourceEvent: string | null;
}

// ─── In-flow 事件映射规则 ──────────────────────────────────────

export interface InFlowMapping {
  /** 可展示文本 */
  displayText: string;
  /** 严重级别 */
  severity: InFlowSeverity;
  /** 来源事件类型 */
  sourceEvent: string;
}

const STEP_STATUS_LABELS: Record<string, string> = {
  pending: "pending",
  in_progress: "in progress",
  completed: "completed",
  blocked: "blocked",
  failed: "failed",
  error: "error",
};

const STORY_STATUS_LABELS: Record<string, string> = {
  backlog: "backlog",
  in_progress: "in progress",
  review: "in review",
  done: "done",
  blocked: "blocked",
  failed: "failed",
  error: "error",
};

function humanizeIdentifier(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function resolveSeverityFromStatus(status: string): InFlowSeverity {
  if (status === "error" || status === "failed" || status === "blocked") {
    return "error";
  }
  if (status === "pending" || status === "backlog") {
    return "warn";
  }
  return "info";
}

/**
 * 从 workflow.step 事件生成 In-flow 消息映射
 *
 * 步骤状态变化直接映射到可展示文本与严重级别。
 */
export function mapStepEventToInFlow(
  stepId: string,
  status: string,
): InFlowMapping {
  const normalizedStepId = humanizeIdentifier(stepId);
  const statusLabel = STEP_STATUS_LABELS[status] ?? humanizeIdentifier(status);
  const severity = resolveSeverityFromStatus(status);

  return {
    displayText: `Workflow step "${normalizedStepId}" is now ${statusLabel}.`,
    severity,
    sourceEvent: "workflow.step",
  };
}

/**
 * 从 workflow.story.status 事件生成 In-flow 消息映射
 *
 * Story 状态变化映射到可展示文本与严重级别。
 */
export function mapStoryStatusEventToInFlow(
  storyId: string,
  status: string,
): InFlowMapping {
  const normalizedStoryId = humanizeIdentifier(storyId);
  const statusLabel = STORY_STATUS_LABELS[status] ?? humanizeIdentifier(status);
  const severity = resolveSeverityFromStatus(status);

  return {
    displayText: `Story "${normalizedStoryId}" moved to ${statusLabel}.`,
    severity,
    sourceEvent: "workflow.story.status",
  };
}

// ─── 排序工具 ──────────────────────────────────────────────────

/**
 * 比较两条消息的排序优先级
 *
 * 规则：先按 createdAt 升序，相同 createdAt 则按 sequence 升序。
 * 保证追加顺序稳定且跨刷新可恢复。
 */
export function compareMessages(
  a: ConversationMessage,
  b: ConversationMessage,
): number {
  if (a.createdAt !== b.createdAt) {
    return a.createdAt - b.createdAt;
  }
  return a.sequence - b.sequence;
}

/**
 * 对消息列表进行稳定排序
 *
 * 返回新数组，不修改原数组。
 */
export function sortMessages(
  messages: ConversationMessage[],
): ConversationMessage[] {
  return [...messages].sort(compareMessages);
}

// ─── 工厂函数 ──────────────────────────────────────────────────

let globalSequence = 0;

/**
 * 重置全局序列号（仅用于测试）
 */
export function resetSequence(): void {
  globalSequence = 0;
}

/**
 * 获取下一个序列号
 */
export function nextSequence(): number {
  globalSequence += 1;
  return globalSequence;
}

/**
 * 创建用户消息
 */
export function createUserMessage(
  id: string,
  content: string,
): ConversationMessage {
  return {
    id,
    kind: "user",
    content,
    createdAt: Date.now(),
    sequence: nextSequence(),
    streamingState: "idle",
    thinkingContent: null,
    thinkingState: "hidden",
    severity: null,
    sourceEvent: null,
  };
}

/**
 * 创建 AI 消息（初始为 streaming 状态）
 */
export function createAiMessage(id: string): ConversationMessage {
  return {
    id,
    kind: "ai",
    content: "",
    createdAt: Date.now(),
    sequence: nextSequence(),
    streamingState: "streaming",
    thinkingContent: null,
    thinkingState: "hidden",
    severity: null,
    sourceEvent: null,
  };
}

/**
 * 创建系统消息
 */
export function createSystemMessage(
  id: string,
  content: string,
): ConversationMessage {
  return {
    id,
    kind: "system",
    content,
    createdAt: Date.now(),
    sequence: nextSequence(),
    streamingState: "idle",
    thinkingContent: null,
    thinkingState: "hidden",
    severity: null,
    sourceEvent: null,
  };
}

/**
 * 创建 In-flow 更新消息
 *
 * 从事件映射结果生成消息实体。
 */
export function createInFlowMessage(
  id: string,
  mapping: InFlowMapping,
): ConversationMessage {
  return {
    id,
    kind: "in_flow_update",
    content: mapping.displayText,
    createdAt: Date.now(),
    sequence: nextSequence(),
    streamingState: "idle",
    thinkingContent: null,
    thinkingState: "hidden",
    severity: mapping.severity,
    sourceEvent: mapping.sourceEvent,
  };
}

// ─── 校验工具函数 ──────────────────────────────────────────────

/**
 * 校验消息类型是否合法
 */
export function isValidMessageKind(kind: unknown): kind is MessageKind {
  return typeof kind === "string" && VALID_MESSAGE_KINDS.has(kind as MessageKind);
}

/**
 * 校验流式状态是否合法
 */
export function isValidStreamingState(
  state: unknown,
): state is StreamingState {
  return (
    typeof state === "string" &&
    VALID_STREAMING_STATES.has(state as StreamingState)
  );
}

/**
 * 校验思考过程状态是否合法
 */
export function isValidThinkingState(
  state: unknown,
): state is ThinkingState {
  return (
    typeof state === "string" &&
    VALID_THINKING_STATES.has(state as ThinkingState)
  );
}

/**
 * 校验严重级别是否合法
 */
export function isValidSeverity(
  severity: unknown,
): severity is InFlowSeverity {
  return (
    typeof severity === "string" &&
    VALID_SEVERITIES.has(severity as InFlowSeverity)
  );
}

/**
 * 校验消息结构完整性
 *
 * 用于持久化恢复时的数据结构校验。
 */
export function isValidMessage(msg: unknown): msg is ConversationMessage {
  if (!msg || typeof msg !== "object") return false;

  const record = msg as Record<string, unknown>;

  if (typeof record.id !== "string" || record.id.length === 0) return false;
  if (!isValidMessageKind(record.kind)) return false;
  if (typeof record.content !== "string") return false;
  if (typeof record.createdAt !== "number" || !Number.isFinite(record.createdAt)) return false;
  if (typeof record.sequence !== "number" || !Number.isFinite(record.sequence)) return false;
  if (!isValidStreamingState(record.streamingState)) return false;

  // thinkingContent 可以为 null 或 string
  if (record.thinkingContent !== null && typeof record.thinkingContent !== "string") return false;

  if (!isValidThinkingState(record.thinkingState)) return false;

  // severity 可以为 null 或合法值
  if (record.severity !== null && !isValidSeverity(record.severity)) return false;

  // sourceEvent 可以为 null 或 string
  if (record.sourceEvent !== null && typeof record.sourceEvent !== "string") return false;

  return true;
}
