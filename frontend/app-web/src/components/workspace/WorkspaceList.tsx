"use client";

/**
 * 工作空间列表容器
 *
 * 包含加载态（Skeleton）、错误态、空状态、数据态四种状态。
 * 使用 TanStack Query 管理数据获取和缓存。
 * 响应式网格：1 列（移动端）/ 2 列（平板）/ 3 列（桌面）。
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/nextjs";
import { AlertCircle, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceCard } from "./WorkspaceCard";
import { WorkspaceEmptyState } from "./WorkspaceEmptyState";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";
import { DeleteWorkspaceDialog } from "./DeleteWorkspaceDialog";
import {
  deleteWorkspace,
  listWorkspaces,
  type WorkspaceResponse,
} from "@/lib/api/workspaces";

export function WorkspaceList() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  // 删除相关状态
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceResponse | null>(null);

  const queryKey = ["workspaces", user?.id];

  const { data: workspaces, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => listWorkspaces(getToken),
    enabled: !!user?.id,
  });

  // 删除 mutation：乐观更新 + 失败回滚
  const deleteMutation = useMutation({
    mutationFn: (workspaceId: number) => deleteWorkspace(workspaceId, getToken),
    onMutate: async (workspaceId: number) => {
      // 取消正在进行的查询，避免覆盖乐观更新
      await queryClient.cancelQueries({ queryKey });

      // 快照当前数据用于失败回滚
      const previousWorkspaces = queryClient.getQueryData<WorkspaceResponse[]>(queryKey);

      // 乐观移除
      queryClient.setQueryData<WorkspaceResponse[]>(queryKey, (prev) =>
        prev?.filter((ws) => ws.id !== workspaceId) ?? [],
      );

      return { previousWorkspaces };
    },
    onError: (_error, _workspaceId, context) => {
      // 失败回滚
      if (context?.previousWorkspaces) {
        queryClient.setQueryData(queryKey, context.previousWorkspaces);
      }
      toast.error("删除失败，请稍后重试");
    },
    onSuccess: () => {
      toast.success("工作空间已删除");
    },
    onSettled: () => {
      // 无论成败，最终与服务器同步
      queryClient.invalidateQueries({ queryKey });
      setDeleteTarget(null);
    },
  });

  function handleDeleteClick(workspace: WorkspaceResponse) {
    setDeleteTarget(workspace);
  }

  function handleDeleteConfirm() {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
    }
  }

  function handleCreateOptimistic(createdWorkspace: { id: number; name: string; createdAt: string; updatedAt: string }) {
    queryClient.setQueryData(
      queryKey,
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
    queryClient.invalidateQueries({ queryKey });
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
            <WorkspaceCard
              key={ws.id}
              workspace={ws}
              onDeleteClick={handleDeleteClick}
            />
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

      {deleteTarget && (
        <DeleteWorkspaceDialog
          workspaceName={deleteTarget.name}
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onConfirm={handleDeleteConfirm}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
