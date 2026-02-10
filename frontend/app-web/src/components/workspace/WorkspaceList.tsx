"use client";

/**
 * 工作空间列表容器
 *
 * 包含加载态（Skeleton）、错误态、空状态、数据态四种状态。
 * 使用 TanStack Query 管理数据获取和缓存。
 * 响应式网格：1 列（移动端）/ 2 列（平板）/ 3 列（桌面）。
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/nextjs";
import { AlertCircle, Plus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceCard } from "./WorkspaceCard";
import { WorkspaceEmptyState } from "./WorkspaceEmptyState";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";
import { listWorkspaces } from "@/lib/api/workspaces";

export function WorkspaceList() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: workspaces, isLoading, isError, refetch } = useQuery({
    queryKey: ["workspaces", user?.id],
    queryFn: () => listWorkspaces(getToken),
    enabled: !!user?.id,
  });

  function handleCreateOptimistic(createdWorkspace: { id: number; name: string; createdAt: string; updatedAt: string }) {
    queryClient.setQueryData(
      ["workspaces", user?.id],
      (prev: { id: number; name: string; createdAt: string; updatedAt: string }[] | undefined) => {
        if (!prev) {
          return [createdWorkspace];
        }
        if (prev.some((workspace) => workspace.id === createdWorkspace.id)) {
          return prev;
        }
        return [createdWorkspace, ...prev];
      },
    );
  }

  function handleCreateSuccess() {
    queryClient.invalidateQueries({ queryKey: ["workspaces", user?.id] });
  }

  // 加载态：3 张骨架卡片
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">我的工作空间</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border-border rounded-lg border p-6">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="mt-3 h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 错误态：显示错误信息和重试按钮
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">我的工作空间</h2>
        </div>
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <AlertCircle className="text-destructive h-12 w-12" />
          <h3 className="text-lg font-semibold">加载失败</h3>
          <p className="text-muted-foreground text-sm">
            无法获取工作空间列表，请检查网络连接后重试
          </p>
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="cursor-pointer"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            重试
          </Button>
        </div>
      </div>
    );
  }

  const isEmpty = !workspaces || workspaces.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">我的工作空间</h2>
        {!isEmpty && (
          <Button
            onClick={() => setDialogOpen(true)}
            className="cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            创建工作空间
          </Button>
        )}
      </div>

      {isEmpty ? (
        <WorkspaceEmptyState onCreateClick={() => setDialogOpen(true)} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => (
            <WorkspaceCard key={ws.id} workspace={ws} />
          ))}
        </div>
      )}

      <CreateWorkspaceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleCreateSuccess}
        onOptimisticCreate={handleCreateOptimistic}
        getToken={getToken}
      />
    </div>
  );
}
