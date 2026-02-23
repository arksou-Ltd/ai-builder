/**
 * Epic/Story 导航树领域模型与状态映射
 *
 * 定义 EpicNode、StoryNode、StoryExecutionStatus、StoryLockState 等类型。
 * 状态枚举对齐 AC1：backlog | in_progress | review | done，映射到灰/蓝/橙/绿。
 * 解锁规则对齐 AC3：仅当前可执行 Story 和已完成 Story 可选中。
 */

// ─── Story 执行状态枚举 ──────────────────────────────────────────

export type StoryExecutionStatus =
  | "backlog"
  | "in_progress"
  | "review"
  | "done";

const VALID_STORY_STATUSES = new Set<StoryExecutionStatus>([
  "backlog",
  "in_progress",
  "review",
  "done",
]);

// ─── Story 锁定状态 ─────────────────────────────────────────────

export type StoryLockState = "unlocked" | "locked";

// ─── 节点类型定义 ───────────────────────────────────────────────

export interface StoryNode {
  /** 稳定唯一标识，与后端 Story ID 对齐 */
  storyId: string;
  /** Story 标题 */
  title: string;
  /** Story 序号（Epic 内 1-based） */
  order: number;
  /** 执行状态 */
  status: StoryExecutionStatus;
}

export interface EpicNode {
  /** 稳定唯一标识，与后端 Epic ID 对齐 */
  epicId: string;
  /** Epic 标题 */
  title: string;
  /** Epic 序号（全局 1-based） */
  order: number;
  /** 下属 Story 列表（按 order 排序） */
  stories: StoryNode[];
}

export interface OrderedStoryRef {
  epicId: string;
  story: StoryNode;
}

// ─── Story 状态 UI 映射 ──────────────────────────────────────────

export interface StoryStatusUIConfig {
  /** 状态标签颜色（Tailwind class） */
  colorClass: string;
  /** 状态标签 i18n key */
  labelI18nKey: string;
}

/**
 * 状态 → UI 映射（灰/蓝/橙/绿）
 * 不仅用颜色表达状态，还配合文字标签满足 WCAG 合规。
 */
export const STORY_STATUS_UI_MAP: Record<
  StoryExecutionStatus,
  StoryStatusUIConfig
> = {
  backlog: {
    colorClass: "text-slate-500",
    labelI18nKey: "storyTree.status.backlog",
  },
  in_progress: {
    colorClass: "text-blue-500",
    labelI18nKey: "storyTree.status.inProgress",
  },
  review: {
    colorClass: "text-amber-500",
    labelI18nKey: "storyTree.status.review",
  },
  done: {
    colorClass: "text-green-500",
    labelI18nKey: "storyTree.status.done",
  },
};

// ─── 解锁规则 ───────────────────────────────────────────────────

/**
 * 计算 Story 列表中每个 Story 的锁定状态
 *
 * 规则（按 Story 顺序执行）：
 * - 状态为 done 的 Story → unlocked（已完成，可回看）
 * - 状态为 in_progress / review 的 Story → unlocked（当前可执行）
 * - 第一个 backlog Story → unlocked（下一个待执行）
 * - 其余 backlog Story → locked（禁止跳步执行）
 */
export function resolveStoryLockStates(
  stories: StoryNode[],
): Map<string, StoryLockState> {
  const lockMap = new Map<string, StoryLockState>();
  let firstBacklogFound = false;

  for (const story of stories) {
    if (story.status === "done" || story.status === "in_progress" || story.status === "review") {
      lockMap.set(story.storyId, "unlocked");
    } else if (story.status === "backlog" && !firstBacklogFound) {
      lockMap.set(story.storyId, "unlocked");
      firstBacklogFound = true;
    } else {
      lockMap.set(story.storyId, "locked");
    }
  }

  return lockMap;
}

/**
 * 按执行顺序展开 Epic/Story（先 Epic.order，再 Story.order）
 */
export function getOrderedStoriesFromEpics(epics: EpicNode[]): OrderedStoryRef[] {
  return [...epics]
    .sort((left, right) => left.order - right.order)
    .flatMap((epic) =>
      [...epic.stories]
        .sort((left, right) => left.order - right.order)
        .map((story) => ({
          epicId: epic.epicId,
          story,
        })),
    );
}

/**
 * 计算跨 Epic 的全局 Story 锁定状态
 *
 * 规则与 resolveStoryLockStates 一致，但输入是全局执行顺序。
 */
export function resolveStoryLockStatesForEpics(
  epics: EpicNode[],
): Map<string, StoryLockState> {
  return resolveStoryLockStates(
    getOrderedStoriesFromEpics(epics).map((entry) => entry.story),
  );
}

// ─── 校验工具函数 ───────────────────────────────────────────────

/**
 * 校验 Story 执行状态是否合法
 */
export function isValidStoryStatus(
  status: unknown,
): status is StoryExecutionStatus {
  return (
    typeof status === "string" &&
    VALID_STORY_STATUSES.has(status as StoryExecutionStatus)
  );
}

// ─── 演示数据（后续接入后端 API 后移除） ─────────────────────────

/**
 * 生成默认演示数据
 *
 * 当后端尚未提供 Epic/Story 导航树 API 时，提供真实可渲染的示例数据。
 * 后续 Story 3.4 WebSocket 接入后，此函数将被替换为真实数据源。
 */
export function createDemoEpicNodes(): EpicNode[] {
  return [
    {
      epicId: "epic-1",
      title: "Project Bootstrap",
      order: 1,
      stories: [
        { storyId: "1-1", title: "Frontend Project Init", order: 1, status: "done" },
        { storyId: "1-2", title: "Backend Workspace Init", order: 2, status: "done" },
        { storyId: "1-3", title: "Dependency Chain Setup", order: 3, status: "done" },
      ],
    },
    {
      epicId: "epic-2",
      title: "Identity & Workspace",
      order: 2,
      stories: [
        { storyId: "2-1", title: "Clerk Sign In", order: 1, status: "done" },
        { storyId: "2-2", title: "Sign Out", order: 2, status: "done" },
        { storyId: "2-3", title: "Workspace Create", order: 3, status: "done" },
        { storyId: "2-4", title: "Workspace Delete", order: 4, status: "done" },
      ],
    },
    {
      epicId: "epic-3",
      title: "Workspace Layout",
      order: 3,
      stories: [
        { storyId: "3-1", title: "Shell & Three Panel", order: 1, status: "done" },
        { storyId: "3-2", title: "Workflow Steps Panel", order: 2, status: "done" },
        { storyId: "3-3", title: "Epic Story Nav Tree", order: 3, status: "in_progress" },
        { storyId: "3-4", title: "Conversation Flow", order: 4, status: "backlog" },
        { storyId: "3-5", title: "Input & Guidance", order: 5, status: "backlog" },
      ],
    },
  ];
}
