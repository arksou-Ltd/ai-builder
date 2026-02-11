"use client";

/**
 * 工作空间卡片组件
 *
 * 展示单个工作空间的名称和创建时间。
 * 右上角三点菜单承载「删除工作空间」操作。
 */

import { MoreHorizontal, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkspaceResponse } from "@/lib/api/workspaces";

interface WorkspaceCardProps {
  workspace: WorkspaceResponse;
  onDeleteClick: (workspace: WorkspaceResponse) => void;
}

export function WorkspaceCard({ workspace, onDeleteClick }: WorkspaceCardProps) {
  const formattedDate = new Date(workspace.createdAt).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="border-border bg-card group relative rounded-lg border p-6 transition-all duration-200 ease-out hover:border-primary/20 hover:shadow-md motion-reduce:transition-none"
      aria-label={`工作空间：${workspace.name}`}
    >
      {/* 三点菜单 */}
      <div className="absolute top-3 right-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="transition-opacity focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
              aria-label="工作空间操作"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDeleteClick(workspace)}
              className="cursor-pointer"
            >
              <Trash2 className="size-4" />
              删除工作空间
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h3 className="truncate pr-8 text-lg font-semibold">{workspace.name}</h3>
      <p className="text-muted-foreground mt-2 text-sm">
        创建于 {formattedDate}
      </p>
    </div>
  );
}
