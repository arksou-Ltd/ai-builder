"use client";

/**
 * 工作空间设置面板
 *
 * 展示 Workspace Settings，包含 Code Sources > GitHub 区块：
 * - 授权状态
 * - 已绑定仓库数量
 * - 管理入口
 */

import { Github, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

const GITHUB_INSTALLATIONS_URL = "https://github.com/settings/installations";

interface WorkspaceSettingsPanelProps {
  githubAuthorized: boolean;
  githubRepoCount: number;
  onManageGithub?: () => void;
}

export function WorkspaceSettingsPanel({
  githubAuthorized,
  githubRepoCount,
  onManageGithub,
}: WorkspaceSettingsPanelProps) {
  const t = useTranslations("workspaceShell");

  return (
    <div className="flex h-full flex-col">
      <div className="border-border border-b pb-4">
        <h2 className="text-lg font-semibold">{t("workspaceSettings")}</h2>
      </div>

      <div className="mt-6">
        <h3 className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wider">
          {t("codeSources")}
        </h3>

        {/* GitHub 信息卡 */}
        <div className="border-border rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="bg-foreground/5 flex size-10 items-center justify-center rounded-lg">
              <Github className="size-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">{t("github")}</h4>
              <p className="text-muted-foreground text-xs">
                {t("githubAuthStatus")}:{" "}
                <span className={githubAuthorized ? "text-green-600" : "text-amber-600"}>
                  {githubAuthorized ? t("authorized") : t("notAuthorized")}
                </span>
              </p>
            </div>
          </div>

          <div className="border-border mt-3 border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                {t("githubRepoCount")}:{" "}
                <span className="text-foreground font-medium">
                  {githubRepoCount > 0 ? githubRepoCount : t("noRepos")}
                </span>
              </span>
              {onManageGithub ? (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={onManageGithub}
                  aria-label={t("githubManage")}
                  className="gap-1"
                  data-testid="github-manage-button"
                >
                  {t("githubManage")}
                  <ExternalLink className="size-3" />
                </Button>
              ) : (
                <Button
                  asChild
                  variant="ghost"
                  size="xs"
                  aria-label={t("githubManage")}
                  className="gap-1"
                >
                  <a
                    href={GITHUB_INSTALLATIONS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="github-manage-button"
                  >
                    {t("githubManage")}
                    <ExternalLink className="size-3" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
