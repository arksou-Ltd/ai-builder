/**
 * Epic/Story 导航树状态持久化 Store
 *
 * 使用 Zustand + persist 中间件，按 workspaceId 隔离持久化。
 * 对齐 ADR-004 "状态可持久化/可恢复"原则。
 *
 * 提供 selectStory、toggleEpic、syncStoryStatuses 等原子操作，
 * 保证切换后中间区与右侧区可读取同一选中 Story。
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  type EpicNode,
  type StoryExecutionStatus,
  createDemoEpicNodes,
  getOrderedStoriesFromEpics,
  isValidStoryStatus,
  resolveStoryLockStatesForEpics,
} from "./workflow-story-tree";

// ─── Store 版本 ─────────────────────────────────────────────────

const STORE_VERSION = 1;

// ─── 单个工作空间的导航树数据 ────────────────────────────────────

export interface WorkspaceStoryTreeData {
  /** Epic 节点列表 */
  epics: EpicNode[];
  /** 当前选中的 Story ID（null 表示未选中） */
  selectedStoryId: string | null;
  /** 展开的 Epic ID 集合 */
  expandedEpicIds: string[];
  /** 是否需要展示“已自动恢复到可继续状态”提示 */
  recoveryHintVisible: boolean;
  /** 数据版本（用于迁移） */
  version: number;
}

// ─── 当前选中 Story 上下文（用于跨区域同步） ────────────────────

export interface SelectedStoryContext {
  storyId: string;
  storyTitle: string;
  storyStatus: StoryExecutionStatus;
  epicId: string;
  epicTitle: string;
}

// ─── Store 接口 ─────────────────────────────────────────────────

interface StoryTreeStore {
  /** 按 workspaceId 隔离的导航树数据 */
  workspaces: Record<string, WorkspaceStoryTreeData>;

  /** 获取指定工作空间的导航树数据（不存在则初始化默认值） */
  getTreeData: (workspaceId: string) => WorkspaceStoryTreeData;

  /** 选中一个 Story（校验解锁状态，锁定 Story 不可选中） */
  selectStory: (workspaceId: string, storyId: string) => boolean;

  /** 切换 Epic 展开/折叠状态 */
  toggleEpic: (workspaceId: string, epicId: string) => void;

  /** 同步 Story 状态（来自事件或 API） */
  syncStoryStatuses: (
    workspaceId: string,
    updates: Array<{ storyId: string; status: StoryExecutionStatus }>,
  ) => void;

  /** 获取当前选中 Story 的跨区域上下文 */
  getSelectedStoryContext: (
    workspaceId: string,
  ) => SelectedStoryContext | null;

  /** 重置指定工作空间的导航树 */
  resetWorkspace: (workspaceId: string) => void;
}

// ─── 内部工具函数 ────────────────────────────────────────────────

function createDefaultTreeData(): WorkspaceStoryTreeData {
  const epics = createDemoEpicNodes();
  return {
    epics,
    selectedStoryId: null,
    expandedEpicIds: epics.length > 0 ? [epics[epics.length - 1].epicId] : [],
    recoveryHintVisible: false,
    version: STORE_VERSION,
  };
}

export function getOrCreateTreeData(
  workspaces: Record<string, WorkspaceStoryTreeData>,
  workspaceId: string,
): WorkspaceStoryTreeData {
  const existing = workspaces[workspaceId];
  if (existing) {
    const sanitized = sanitizeTreeData(existing);
    if (sanitized) return sanitized;
  }
  return createDefaultTreeData();
}

function sanitizeTreeData(
  data: WorkspaceStoryTreeData,
): WorkspaceStoryTreeData | null {
  if (data.version !== STORE_VERSION) return null;
  if (!Array.isArray(data.epics) || data.epics.length === 0) return null;

  // 校验每个 Epic 和 Story 的关键字段
  for (const epic of data.epics) {
    if (!epic.epicId || !Array.isArray(epic.stories)) return null;
    for (const story of epic.stories) {
      if (!story.storyId || !isValidStoryStatus(story.status)) return null;
    }
  }

  const normalizedData: WorkspaceStoryTreeData = {
    ...data,
    recoveryHintVisible:
      typeof data.recoveryHintVisible === "boolean"
        ? data.recoveryHintVisible
        : false,
  };

  // 校验 selectedStoryId 引用有效；异常时自动回退到最近可用 Story 并标记提示
  if (normalizedData.selectedStoryId !== null) {
    const allStoryIds = normalizedData.epics.flatMap((e) =>
      e.stories.map((s) => s.storyId),
    );
    const selectedMissing = !allStoryIds.includes(normalizedData.selectedStoryId);
    const selectedLocked =
      !selectedMissing &&
      !isStorySelectable(normalizedData.epics, normalizedData.selectedStoryId);

    if (selectedMissing || selectedLocked) {
      return {
        ...normalizedData,
        selectedStoryId: findFallbackStoryId(normalizedData.epics),
        recoveryHintVisible: true,
      };
    }
  }

  return normalizedData;
}

/**
 * 查找 Story 所在的 Epic 和 Story 对象
 */
function findStoryInEpics(
  epics: EpicNode[],
  storyId: string,
): { epic: EpicNode; story: (typeof epics)[0]["stories"][0] } | null {
  for (const epic of epics) {
    const story = epic.stories.find((s) => s.storyId === storyId);
    if (story) return { epic, story };
  }
  return null;
}

/**
 * 检查 Story 是否可选中（基于解锁规则）
 */
function isStorySelectable(epics: EpicNode[], storyId: string): boolean {
  const lockStates = resolveStoryLockStatesForEpics(epics);
  return lockStates.get(storyId) === "unlocked";
}

// ─── Store 实现 ─────────────────────────────────────────────────

export const useStoryTreeStore = create<StoryTreeStore>()(
  persist(
    (set, get) => ({
      workspaces: {},

      getTreeData: (workspaceId: string) => {
        return getOrCreateTreeData(get().workspaces, workspaceId);
      },

      selectStory: (workspaceId: string, storyId: string) => {
        const data = getOrCreateTreeData(get().workspaces, workspaceId);

        // 校验锁定状态：锁定 Story 不可选中
        if (!isStorySelectable(data.epics, storyId)) {
          return false;
        }

        set((state) => ({
          workspaces: {
            ...state.workspaces,
            [workspaceId]: {
              ...getOrCreateTreeData(state.workspaces, workspaceId),
              selectedStoryId: storyId,
              recoveryHintVisible: false,
            },
          },
        }));
        return true;
      },

      toggleEpic: (workspaceId: string, epicId: string) => {
        set((state) => {
          const data = getOrCreateTreeData(state.workspaces, workspaceId);
          const isExpanded = data.expandedEpicIds.includes(epicId);
          const expandedEpicIds = isExpanded
            ? data.expandedEpicIds.filter((id) => id !== epicId)
            : [...data.expandedEpicIds, epicId];

          return {
            workspaces: {
              ...state.workspaces,
              [workspaceId]: { ...data, expandedEpicIds },
            },
          };
        });
      },

      syncStoryStatuses: (workspaceId, updates) => {
        set((state) => {
          const data = getOrCreateTreeData(state.workspaces, workspaceId);
          const updateMap = new Map(
            updates
              .filter((u) => isValidStoryStatus(u.status))
              .map((u) => [u.storyId, u.status]),
          );

          const updatedEpics = data.epics.map((epic) => ({
            ...epic,
            stories: epic.stories.map((story) => {
              const newStatus = updateMap.get(story.storyId);
              return newStatus ? { ...story, status: newStatus } : story;
            }),
          }));

          // 如果选中 Story 变为 locked，降级到最近一次有效选中项
          let selectedStoryId = data.selectedStoryId;
          let recoveryHintVisible = data.recoveryHintVisible;
          if (selectedStoryId && !isStorySelectable(updatedEpics, selectedStoryId)) {
            selectedStoryId = findFallbackStoryId(updatedEpics);
            recoveryHintVisible = true;
          }

          return {
            workspaces: {
              ...state.workspaces,
              [workspaceId]: {
                ...data,
                epics: updatedEpics,
                selectedStoryId,
                recoveryHintVisible,
              },
            },
          };
        });
      },

      getSelectedStoryContext: (workspaceId: string) => {
        const data = getOrCreateTreeData(get().workspaces, workspaceId);
        if (!data.selectedStoryId) return null;

        const found = findStoryInEpics(data.epics, data.selectedStoryId);
        if (!found) return null;

        return {
          storyId: found.story.storyId,
          storyTitle: found.story.title,
          storyStatus: found.story.status,
          epicId: found.epic.epicId,
          epicTitle: found.epic.title,
        };
      },

      resetWorkspace: (workspaceId: string) => {
        set((state) => ({
          workspaces: {
            ...state.workspaces,
            [workspaceId]: createDefaultTreeData(),
          },
        }));
      },
    }),
    {
      name: "ai-builder-story-tree",
      partialize: (state) => ({ workspaces: state.workspaces }),
    },
  ),
);

/**
 * 查找降级 Story ID（最近的可选中 Story）
 */
function findFallbackStoryId(epics: EpicNode[]): string | null {
  const lockStates = resolveStoryLockStatesForEpics(epics);
  const orderedStories = getOrderedStoriesFromEpics(epics);
  for (let i = orderedStories.length - 1; i >= 0; i--) {
    const storyId = orderedStories[i].story.storyId;
    if (lockStates.get(storyId) === "unlocked") {
      return storyId;
    }
  }
  return null;
}
