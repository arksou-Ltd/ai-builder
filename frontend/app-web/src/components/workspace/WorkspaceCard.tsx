"use client";

/**
 * 工作空间卡片组件
 *
 * 展示单个工作空间的名称和创建时间。
 * 悬停效果：shadow-md + border-primary/20 过渡。
 */

import type { WorkspaceResponse } from "@/lib/api/workspaces";

interface WorkspaceCardProps {
  workspace: WorkspaceResponse;
}

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  const formattedDate = new Date(workspace.createdAt).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="border-border bg-card rounded-lg border p-6 transition-all duration-200 ease-out hover:border-primary/20 hover:shadow-md motion-reduce:transition-none"
      aria-label={`工作空间：${workspace.name}`}
    >
      <h3 className="truncate text-lg font-semibold">{workspace.name}</h3>
      <p className="text-muted-foreground mt-2 text-sm">
        创建于 {formattedDate}
      </p>
    </div>
  );
}
