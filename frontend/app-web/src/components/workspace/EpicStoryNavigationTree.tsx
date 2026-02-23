/**
 * Epic/Story 导航树组件
 *
 * 渲染 Epic → Story 两层结构，显示状态标识，支持展开/折叠、选中、锁定。
 * 使用 shadcn Accordion 实现折叠交互（150-300ms 过渡）。
 * 遵循 WAI-ARIA Treeview 模式：role="tree"/role="treeitem"、aria-expanded/aria-selected。
 * 支持键盘导航：Up/Down/Left/Right/Enter。
 */

"use client";

import { useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, Circle, Loader2, CheckCircle2, Eye } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type {
  EpicNode,
  StoryNode,
  StoryExecutionStatus,
  StoryLockState,
} from "@/lib/workflow/workflow-story-tree";
import { STORY_STATUS_UI_MAP } from "@/lib/workflow/workflow-story-tree";

// ─── 组件 Props ─────────────────────────────────────────────────

export interface EpicStoryNavigationTreeProps {
  /** Epic 列表 */
  epics: EpicNode[];
  /** 当前选中的 Story ID */
  selectedStoryId: string | null;
  /** 展开的 Epic ID 列表 */
  expandedEpicIds: string[];
  /** 所有 Story 的锁定状态映射 */
  lockStates: Map<string, StoryLockState>;
  /** 选中 Story 回调 */
  onSelectStory: (storyId: string) => void;
  /** 切换 Epic 展开/折叠回调 */
  onToggleEpic: (epicId: string) => void;
}

// ─── 状态图标映射 ───────────────────────────────────────────────

const STATUS_ICON_MAP: Record<
  StoryExecutionStatus,
  typeof Circle
> = {
  backlog: Circle,
  in_progress: Loader2,
  review: Eye,
  done: CheckCircle2,
};

// ─── 主组件 ─────────────────────────────────────────────────────

export function EpicStoryNavigationTree({
  epics,
  selectedStoryId,
  expandedEpicIds,
  lockStates,
  onSelectStory,
  onToggleEpic,
}: EpicStoryNavigationTreeProps) {
  const t = useTranslations("storyTree");
  const treeRef = useRef<HTMLDivElement>(null);

  const handleAccordionValueChange = useCallback(
    (nextExpandedIds: string[]) => {
      const currentSet = new Set(expandedEpicIds);
      const nextSet = new Set(nextExpandedIds);

      for (const epic of epics) {
        const currentlyExpanded = currentSet.has(epic.epicId);
        const nextExpanded = nextSet.has(epic.epicId);
        if (currentlyExpanded !== nextExpanded) {
          onToggleEpic(epic.epicId);
        }
      }
    },
    [epics, expandedEpicIds, onToggleEpic],
  );

  // ─── 键盘导航 ───────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const tree = treeRef.current;
      if (!tree) return;

      const allItems = Array.from(
        tree.querySelectorAll<HTMLElement>('[role="treeitem"]'),
      );
      const activeElement = document.activeElement as HTMLElement;
      const activeItem = getActiveTreeItem(tree, activeElement);
      if (!activeItem) return;
      const currentIndex = allItems.indexOf(activeItem);
      if (currentIndex < 0) return;

      let handled = false;

      switch (event.key) {
        case "ArrowDown": {
          // 移动到下一个可见的 treeitem
          for (let i = currentIndex + 1; i < allItems.length; i++) {
            const item = allItems[i];
            if (isVisibleTreeItem(item, tree)) {
              focusTreeItem(item);
              handled = true;
              break;
            }
          }
          break;
        }
        case "ArrowUp": {
          // 移动到上一个可见的 treeitem
          for (let i = currentIndex - 1; i >= 0; i--) {
            const item = allItems[i];
            if (isVisibleTreeItem(item, tree)) {
              focusTreeItem(item);
              handled = true;
              break;
            }
          }
          break;
        }
        case "ArrowRight": {
          // 展开 Epic 或移动到第一个子 Story
          const epicId = activeItem.dataset.epicId;
          if (epicId) {
            if (!expandedEpicIds.includes(epicId)) {
              onToggleEpic(epicId);
            } else {
              // 移动到第一个子 Story
              const firstChild = tree.querySelector<HTMLElement>(
                `[role="treeitem"][data-parent-epic="${epicId}"]`,
              );
              if (firstChild) focusTreeItem(firstChild);
            }
            handled = true;
          }
          break;
        }
        case "ArrowLeft": {
          // 折叠 Epic 或移动到父 Epic
          const epicIdLeft = activeItem.dataset.epicId;
          const parentEpic = activeItem.dataset.parentEpic;
          if (epicIdLeft && expandedEpicIds.includes(epicIdLeft)) {
            onToggleEpic(epicIdLeft);
            handled = true;
          } else if (parentEpic) {
            const parentItem = tree.querySelector<HTMLElement>(
              `[role="treeitem"][data-epic-id="${parentEpic}"]`,
            );
            if (parentItem) focusTreeItem(parentItem);
            handled = true;
          }
          break;
        }
        case "Enter":
        case " ": {
          // 选中 Story 或切换 Epic
          const selectEpicId = activeItem.dataset.epicId;
          const selectStoryId = activeItem.dataset.storyId;
          if (selectEpicId) {
            onToggleEpic(selectEpicId);
            handled = true;
          } else if (
            selectStoryId &&
            activeItem.getAttribute("aria-disabled") !== "true"
          ) {
            onSelectStory(selectStoryId);
            handled = true;
          }
          break;
        }
        case "Home": {
          // 移动到第一个可见 treeitem
          const firstItem = allItems.find((item) =>
            isVisibleTreeItem(item, tree),
          );
          if (firstItem) {
            focusTreeItem(firstItem);
            handled = true;
          }
          break;
        }
        case "End": {
          // 移动到最后一个可见 treeitem
          for (let i = allItems.length - 1; i >= 0; i--) {
            if (isVisibleTreeItem(allItems[i], tree)) {
              focusTreeItem(allItems[i]);
              handled = true;
              break;
            }
          }
          break;
        }
      }

      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [expandedEpicIds, onToggleEpic, onSelectStory],
  );

  // ─── 首次渲染时聚焦选中项 ─────────────────────────────────

  useEffect(() => {
    if (selectedStoryId && treeRef.current) {
      const selectedItem = treeRef.current.querySelector<HTMLElement>(
        `[data-story-id="${selectedStoryId}"]`,
      );
      if (selectedItem) {
        selectedItem.focus();
      }
    }
  }, [selectedStoryId]);

  if (epics.length === 0) {
    return (
      <div className="px-3 py-4">
        <p className="text-muted-foreground text-sm">{t("emptyState")}</p>
      </div>
    );
  }

  return (
    <div className="py-2">
      <h3 className="text-muted-foreground mb-2 px-3 text-xs font-medium uppercase tracking-wider">
        {t("title")}
      </h3>
      <div
        ref={treeRef}
        role="tree"
        aria-label={t("title")}
        onKeyDown={handleKeyDown}
        className="space-y-0.5"
      >
        <Accordion
          type="multiple"
          value={expandedEpicIds}
          onValueChange={handleAccordionValueChange}
          className="space-y-0.5"
        >
          {epics.map((epic) => (
            <EpicTreeItem
              key={epic.epicId}
              epic={epic}
              selectedStoryId={selectedStoryId}
              isExpanded={expandedEpicIds.includes(epic.epicId)}
              lockStates={lockStates}
              onSelectStory={onSelectStory}
            />
          ))}
        </Accordion>
      </div>
    </div>
  );
}

// ─── Epic 节点 ──────────────────────────────────────────────────

interface EpicTreeItemProps {
  epic: EpicNode;
  selectedStoryId: string | null;
  isExpanded: boolean;
  lockStates: Map<string, StoryLockState>;
  onSelectStory: (storyId: string) => void;
}

function EpicTreeItem({
  epic,
  selectedStoryId,
  isExpanded,
  lockStates,
  onSelectStory,
}: EpicTreeItemProps) {
  return (
    <AccordionItem value={epic.epicId} asChild className="border-none">
      <li
        role="treeitem"
        aria-expanded={isExpanded}
        aria-selected={false}
        data-epic-id={epic.epicId}
        className="select-none"
      >
        <AccordionTrigger
          data-epic-id={epic.epicId}
          tabIndex={0}
          className={cn(
            "flex w-full items-center gap-1.5 rounded-md px-3 py-1.5 text-left text-sm font-medium",
            "transition-colors duration-150 hover:no-underline",
            "hover:bg-accent",
            "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
            "text-foreground",
          )}
          aria-label={`Epic ${epic.order}: ${epic.title}`}
        >
          <ChevronRight
            className={cn(
              "size-3.5 shrink-0 transition-transform duration-200",
              isExpanded && "rotate-90",
            )}
          />
          <span className="truncate">
            {epic.order}. {epic.title}
          </span>
        </AccordionTrigger>

        {/* Story 列表：Accordion + 200ms 折叠动效 */}
        <AccordionContent forceMount className="px-0 pb-0 pt-0">
          <ul
            role="group"
            className={cn(
              "overflow-hidden transition-all duration-200 ease-in-out",
              isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0",
            )}
          >
            {epic.stories.map((story) => (
              <StoryTreeItem
                key={story.storyId}
                story={story}
                epicId={epic.epicId}
                isSelected={selectedStoryId === story.storyId}
                lockState={lockStates.get(story.storyId) ?? "locked"}
                onSelect={onSelectStory}
              />
            ))}
          </ul>
        </AccordionContent>
      </li>
    </AccordionItem>
  );
}

// ─── Story 节点 ──────────────────────────────────────────────────

interface StoryTreeItemProps {
  story: StoryNode;
  epicId: string;
  isSelected: boolean;
  lockState: StoryLockState;
  onSelect: (storyId: string) => void;
}

function StoryTreeItem({
  story,
  epicId,
  isSelected,
  lockState,
  onSelect,
}: StoryTreeItemProps) {
  const t = useTranslations("storyTree");
  const isLocked = lockState === "locked";
  const statusConfig = STORY_STATUS_UI_MAP[story.status];
  const StatusIcon = STATUS_ICON_MAP[story.status];

  const handleClick = useCallback(() => {
    if (!isLocked) {
      onSelect(story.storyId);
    }
  }, [isLocked, onSelect, story.storyId]);

  const statusLabel = t(statusConfig.labelI18nKey.replace("storyTree.", ""));

  return (
    <li
      role="treeitem"
      aria-selected={isSelected}
      aria-disabled={isLocked}
      data-story-id={story.storyId}
      data-parent-epic={epicId}
      tabIndex={isLocked ? -1 : 0}
      onClick={handleClick}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md py-1.5 pl-8 pr-3 text-sm",
        "transition-colors duration-150",
        "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        isSelected && "border-l-2 border-green-500 bg-accent font-medium text-foreground",
        !isSelected && !isLocked && "text-muted-foreground hover:bg-accent/50",
        isLocked && "cursor-not-allowed opacity-50",
      )}
    >
      <StatusIcon
        className={cn(
          "size-3.5 shrink-0",
          statusConfig.colorClass,
          story.status === "in_progress" && "animate-spin",
        )}
        aria-hidden="true"
      />
      <span className="flex-1 truncate">
        {story.order}. {story.title}
      </span>
      <span
        className={cn(
          "shrink-0 text-xs",
          statusConfig.colorClass,
        )}
        aria-label={statusLabel}
      >
        {statusLabel}
      </span>
    </li>
  );
}

// ─── 工具函数 ────────────────────────────────────────────────────

/**
 * 判断 treeitem 是否可见（父 Epic 展开时可见）
 */
function isVisibleTreeItem(
  item: HTMLElement,
  tree: HTMLElement,
): boolean {
  // 顶层 Epic 节点始终可见
  if (item.dataset.epicId) return true;

  // Story 节点：检查父 Epic 是否展开
  const parentEpicId = item.dataset.parentEpic;
  if (!parentEpicId) return false;

  const parentEpic = tree.querySelector<HTMLElement>(
    `[data-epic-id="${parentEpicId}"]`,
  );
  if (!parentEpic) return false;

  const parentLi = parentEpic.closest('[role="treeitem"]');
  return parentLi?.getAttribute("aria-expanded") === "true";
}

/**
 * 从当前焦点元素解析对应 treeitem
 */
function getActiveTreeItem(
  tree: HTMLElement,
  activeElement: HTMLElement | null,
): HTMLElement | null {
  if (!activeElement) return null;
  if (
    activeElement.getAttribute("role") === "treeitem" &&
    tree.contains(activeElement)
  ) {
    return activeElement;
  }

  const closestTreeItem = activeElement.closest<HTMLElement>('[role="treeitem"]');
  if (!closestTreeItem || !tree.contains(closestTreeItem)) {
    return null;
  }
  return closestTreeItem;
}

/**
 * 将焦点移动到 treeitem 的主要可交互元素
 */
function focusTreeItem(item: HTMLElement): void {
  const epicButton = item.querySelector<HTMLElement>("button[data-epic-id]");
  if (epicButton) {
    epicButton.focus();
    return;
  }
  item.focus();
}
