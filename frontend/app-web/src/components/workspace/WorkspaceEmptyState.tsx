"use client";

/**
 * 工作空间空状态组件
 *
 * 当用户没有任何工作空间时展示引导界面。
 * 使用 FolderOpen 图标（lucide-react），禁止使用 emoji 作为图标。
 */

import { FolderOpen, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface WorkspaceEmptyStateProps {
  onCreateClick: () => void;
}

export function WorkspaceEmptyState({ onCreateClick }: WorkspaceEmptyStateProps) {
  const t = useTranslations("workspace.emptyState");
  const tWorkspace = useTranslations("workspace");

  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-dashed border-border/50 bg-white/30 px-6 py-20 text-center backdrop-blur-sm transition-all hover:bg-white/40 dark:bg-white/5 dark:hover:bg-white/10">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 shadow-inner">
        <FolderOpen className="text-primary h-10 w-10" />
      </div>

      <div className="max-w-md space-y-2">
        <h2 className="font-poppins text-xl font-semibold tracking-tight text-foreground">
          {t("title")}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {t("description")}
          <br />
          {t("descriptionSuffix")}
        </p>
      </div>

      <Button
        onClick={onCreateClick}
        size="lg"
        className="mt-4 cursor-pointer bg-primary font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
      >
        <Plus className="mr-2 h-5 w-5" />
        {tWorkspace("createButton")}
      </Button>
    </div>
  );
}
