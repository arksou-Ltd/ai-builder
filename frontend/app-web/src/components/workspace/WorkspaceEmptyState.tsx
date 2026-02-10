"use client";

/**
 * 工作空间空状态组件
 *
 * 当用户没有任何工作空间时展示引导界面。
 * 使用 FolderOpen 图标（lucide-react），禁止使用 emoji 作为图标。
 */

import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkspaceEmptyStateProps {
  onCreateClick: () => void;
}

export function WorkspaceEmptyState({ onCreateClick }: WorkspaceEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <FolderOpen className="text-muted-foreground h-12 w-12" />
      <h2 className="text-xl font-semibold tracking-tight">开始您的第一个工作空间</h2>
      <p className="text-muted-foreground max-w-sm text-sm">
        创建工作空间并导入 GitHub 仓库，开始用自然语言实现需求
      </p>
      <Button onClick={onCreateClick} className="mt-2 cursor-pointer">
        创建工作空间
      </Button>
    </div>
  );
}
