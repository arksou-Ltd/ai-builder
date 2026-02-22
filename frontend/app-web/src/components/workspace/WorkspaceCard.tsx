"use client";

/**
 * 工作空间卡片组件
 *
 * 展示单个工作空间的名称和创建时间。
 * 右上角三点菜单承载「删除工作空间」操作。
 */

import { MoreHorizontal, Trash2, Box } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";

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
  const t = useTranslations("workspace");
  const locale = useLocale();
  const router = useRouter();

  const formattedCreatedDate = new Date(workspace.createdAt).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedUpdatedDate = new Date(workspace.updatedAt).toLocaleDateString(locale);

  return (
    <div
      className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/20 bg-white/70 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-white/5 dark:border-white/10"
      aria-label={t("cardAriaLabel", { name: workspace.name })}
    >
      {/* 装饰性背景光效 */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl transition-all duration-500 group-hover:bg-primary/20" />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 text-primary shadow-inner">
            <Box className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-poppins text-lg font-semibold tracking-tight text-foreground/90 group-hover:text-primary transition-colors">
              {workspace.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("createdAt", { date: formattedCreatedDate })}
            </p>
          </div>
        </div>

        {/* 三点菜单 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="h-8 w-8 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary"
              aria-label={t("actions")}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDeleteClick(workspace)}
              className="cursor-pointer focus:bg-destructive/10 focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              {t("deleteAction")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
        <span className="text-xs font-medium text-muted-foreground">{t("lastUpdated", { date: formattedUpdatedDate })}</span>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs text-primary hover:no-underline opacity-0 transition-opacity cursor-pointer group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={() => router.push(`/workspace/${workspace.id}`)}
        >
          {t("enterSpace")} &rarr;
        </Button>
      </div>
    </div>
  );
}
