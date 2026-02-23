/**
 * 工作空间 Story 导航树状态 Hook
 *
 * 从 Zustand store 读取指定 workspaceId 的导航树状态，
 * 并提供选中 Story 的上下文供中间区和右侧区同步。
 */

import { useMemo } from "react";

import {
  type SelectedStoryContext,
  type WorkspaceStoryTreeData,
  getOrCreateTreeData,
  useStoryTreeStore,
} from "@/lib/workflow/workflow-story-tree-store";
import {
  type StoryLockState,
  resolveStoryLockStatesForEpics,
} from "@/lib/workflow/workflow-story-tree";

export interface UseWorkspaceStoryTreeResult {
  /** 导航树数据（包含 epics、selectedStoryId、expandedEpicIds） */
  treeData: WorkspaceStoryTreeData;
  /** 当前选中 Story 上下文（用于跨区域同步） */
  selectedContext: SelectedStoryContext | null;
  /** 所有 Story 的锁定状态映射 */
  lockStates: Map<string, StoryLockState>;
  /** 选中 Story 回调 */
  selectStory: (storyId: string) => boolean;
  /** 切换 Epic 展开/折叠回调 */
  toggleEpic: (epicId: string) => void;
}

export function useWorkspaceStoryTree(
  workspaceId: string,
): UseWorkspaceStoryTreeResult {
  const workspaces = useStoryTreeStore((state) => state.workspaces);
  const selectStoryAction = useStoryTreeStore((state) => state.selectStory);
  const toggleEpicAction = useStoryTreeStore((state) => state.toggleEpic);
  const getSelectedStoryContext = useStoryTreeStore(
    (state) => state.getSelectedStoryContext,
  );

  const treeData = useMemo(
    () => getOrCreateTreeData(workspaces, workspaceId),
    [workspaces, workspaceId],
  );

  const selectedContext = useMemo(
    () => getSelectedStoryContext(workspaceId),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- workspaces 变化时需要重新计算选中上下文
    [getSelectedStoryContext, workspaceId, workspaces],
  );

  const lockStates = useMemo(() => {
    return resolveStoryLockStatesForEpics(treeData.epics);
  }, [treeData.epics]);

  const selectStory = useMemo(
    () => (storyId: string) => selectStoryAction(workspaceId, storyId),
    [selectStoryAction, workspaceId],
  );

  const toggleEpic = useMemo(
    () => (epicId: string) => toggleEpicAction(workspaceId, epicId),
    [toggleEpicAction, workspaceId],
  );

  return {
    treeData,
    selectedContext,
    lockStates,
    selectStory,
    toggleEpic,
  };
}
