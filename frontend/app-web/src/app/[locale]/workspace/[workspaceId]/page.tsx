"use client";

/**
 * 工作空间执行页
 *
 * 三面板壳层入口：顶部导航 + 左侧导航 + 中间对话区 + 右侧面板
 * Story 3.1 交付壳层结构，Story 3.2 接入步骤面板，后续 Story 3.3~3.12 增量实现。
 */

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { ListChecks, Settings } from "lucide-react";

import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { WorkspaceError } from "@/components/workspace/WorkspaceError";
import { WorkspaceSettingsPanel } from "@/components/workspace/WorkspaceSettingsPanel";
import { DesktopGuard } from "@/components/workspace/DesktopGuard";
import { WorkflowStepsPanel } from "@/components/workspace/WorkflowStepsPanel";
import { EpicStoryNavigationTree } from "@/components/workspace/EpicStoryNavigationTree";
import { useWorkspaceWorkflowSteps } from "@/components/workspace/hooks/useWorkspaceWorkflowSteps";
import { useWorkspaceStoryTree } from "@/components/workspace/hooks/useWorkspaceStoryTree";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getWorkspace } from "@/lib/api/workspaces";
import { cn } from "@/lib/utils";
import { subscribeWorkflowStepEvents } from "@/lib/workflow/workflow-step-events";
import { subscribeStoryTreeEvents } from "@/lib/workflow/workflow-story-tree-events";

export default function WorkspacePage() {
  const params = useParams<{ workspaceId: string }>();
  const { getToken } = useAuth();
  const { user } = useUser();
  const t = useTranslations("workspaceShell");
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [selectionFailedNotice, setSelectionFailedNotice] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncDesktopState = () => setIsDesktop(mediaQuery.matches);

    syncDesktopState();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncDesktopState);
      return () => mediaQuery.removeEventListener("change", syncDesktopState);
    }

    mediaQuery.addListener(syncDesktopState);
    return () => mediaQuery.removeListener(syncDesktopState);
  }, []);

  useEffect(() => {
    if (!params.workspaceId) return;
    const unsubStep = subscribeWorkflowStepEvents(params.workspaceId);
    const unsubTree = subscribeStoryTreeEvents(params.workspaceId);
    return () => {
      unsubStep();
      unsubTree();
    };
  }, [params.workspaceId]);

  // 获取工作空间详情
  const {
    data: workspace,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["workspace", params.workspaceId],
    queryFn: () => getWorkspace(params.workspaceId, getToken),
    enabled: isDesktop === true,
  });

  const githubAuthorized = Boolean(
    user?.externalAccounts?.some(
      (account) => account.provider === "github",
    ),
  );
  const githubRepoCount = resolveGithubRepoCount(user?.publicMetadata);

  // 工作流步骤状态（从持久化 store 恢复）
  const { steps: workflowSteps, currentStepId } = useWorkspaceWorkflowSteps(
    params.workspaceId,
  );

  // Epic/Story 导航树状态（从持久化 store 恢复）
  const {
    treeData,
    selectedContext,
    lockStates,
    selectStory,
    toggleEpic,
  } = useWorkspaceStoryTree(params.workspaceId);

  const tStoryTree = useTranslations("storyTree");

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleSelectStory = useCallback(
    (storyId: string) => {
      const success = selectStory(storyId);
      if (!success) {
        setSelectionFailedNotice(true);
      } else {
        setSelectionFailedNotice(false);
      }
    },
    [selectStory],
  );

  const selectedContextMissing = Boolean(
    treeData.selectedStoryId && !selectedContext,
  );
  const storyTreeNotice = selectedContext
    ? null
    : selectionFailedNotice
      ? tStoryTree("lockedTooltip")
      : treeData.recoveryHintVisible
        ? tStoryTree("recoveryHint")
      : selectedContextMissing
        ? tStoryTree("recoveryHint")
        : null;

  if (isDesktop === false) {
    return <DesktopGuard />;
  }

  if (isDesktop !== true) {
    return null;
  }

  // 加载态：骨架屏
  if (isLoading) {
    return (
      <>
        <WorkspaceHeader
          workspaceName=""
        />
        <WorkspaceShell
          leftPanel={
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          }
          centerPanel={
            <div className="flex flex-1 items-center justify-center">
              <Skeleton className="h-8 w-48" />
            </div>
          }
          rightPanel={
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          }
        />
      </>
    );
  }

  // 错误态：可恢复错误提示
  if (isError) {
    return (
      <>
        <WorkspaceHeader
          workspaceName=""
        />
        <WorkspaceShell
          centerPanel={<WorkspaceError onRetry={handleRetry} />}
        />
      </>
    );
  }

  // 正常态：三面板布局
  return (
    <>
      <WorkspaceHeader
        workspaceName={workspace?.name ?? ""}
      />
      <WorkspaceShell
        leftPanel={
          <div className="space-y-4">
            {/* Story 3.2: 工作流步骤面板 */}
            <WorkflowStepsPanel
              steps={workflowSteps}
              currentStepId={currentStepId}
            />
            {/* Story 3.3: Epic/Story 导航树 */}
            <EpicStoryNavigationTree
              epics={treeData.epics}
              selectedStoryId={treeData.selectedStoryId}
              expandedEpicIds={treeData.expandedEpicIds}
              lockStates={lockStates}
              onSelectStory={handleSelectStory}
              onToggleEpic={toggleEpic}
            />
          </div>
        }
        centerPanel={
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            {/* Story 3.4~3.5 将在此处实现对话流和输入区 */}
            {storyTreeNotice ? (
              <p
                className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
                data-testid="story-tree-recovery-notice"
              >
                {storyTreeNotice}
              </p>
            ) : null}
            {selectedContext ? (
              <div className="text-center" data-testid="selected-story-context">
                <p className="text-sm font-medium text-foreground">
                  {selectedContext.epicTitle} / {selectedContext.storyTitle}
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  {tStoryTree(`status.${selectedContext.storyStatus === "in_progress" ? "inProgress" : selectedContext.storyStatus}`)}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {workspace?.name}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              data-testid="center-placeholder-action"
              className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t("centerPanelAction")}
            </Button>
          </div>
        }
        rightPanel={
          <Tabs defaultValue="progress">
            <TabsList className="w-full">
              <TabsTrigger value="progress" className="flex-1 gap-1.5">
                <ListChecks className="size-4" />
                {t("tabProgress")}
              </TabsTrigger>
              {/* Story 3.7~3.10 将在此处增加更多 Tab（文档/界面/E2B沙箱） */}
              <TabsTrigger value="settings" className="flex-1 gap-1.5">
                <Settings className="size-4" />
                {t("tabSettings")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="progress" className="mt-4">
              {/* Story 3.7 将在此处实现需求进度 Tab 全量内容 */}
              {selectedContext ? (
                <div className="space-y-2" data-testid="progress-story-context">
                  <p className="text-sm font-medium text-foreground">
                    {selectedContext.storyTitle}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {selectedContext.epicTitle}
                  </p>
                  <p className="text-xs">
                    <span className={cn(
                      selectedContext.storyStatus === "backlog" && "text-slate-500",
                      selectedContext.storyStatus === "in_progress" && "text-blue-500",
                      selectedContext.storyStatus === "review" && "text-amber-500",
                      selectedContext.storyStatus === "done" && "text-green-500",
                    )}>
                      {tStoryTree(`status.${selectedContext.storyStatus === "in_progress" ? "inProgress" : selectedContext.storyStatus}`)}
                    </span>
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">{t("rightPanelPlaceholder")}</p>
              )}
            </TabsContent>
            <TabsContent value="settings" className="mt-4">
              <WorkspaceSettingsPanel
                githubAuthorized={githubAuthorized}
                githubRepoCount={githubRepoCount}
              />
            </TabsContent>
          </Tabs>
        }
      />
    </>
  );
}

function resolveGithubRepoCount(metadata: unknown): number {
  if (!metadata || typeof metadata !== "object") {
    return 0;
  }

  const record = metadata as Record<string, unknown>;
  const github =
    record.github && typeof record.github === "object"
      ? (record.github as Record<string, unknown>)
      : undefined;

  const candidates = [
    record.githubRepoCount,
    record.github_repo_count,
    github?.repoCount,
    github?.repo_count,
  ];

  for (const value of candidates) {
    const count = parseRepoCount(value);
    if (count !== null) {
      return count;
    }
  }

  return 0;
}

function parseRepoCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.floor(parsed);
    }
  }

  return null;
}
