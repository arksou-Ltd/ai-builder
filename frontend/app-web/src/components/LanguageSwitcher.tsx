"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

/**
 * 语言切换按钮
 *
 * 当前中文 → 显示 "EN"（点击切换到英文）
 * 当前英文 → 显示 "中文"（点击切换到中文）
 */
export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("languageSwitcher");

  function handleSwitch() {
    const nextLocale = locale === "zh-CN" ? "en" : "zh-CN";
    router.replace({ pathname }, { locale: nextLocale });
  }

  return (
    <button
      onClick={handleSwitch}
      className="rounded-md px-2.5 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
      type="button"
    >
      {locale === "zh-CN" ? t("switchToEn") : t("switchToZh")}
    </button>
  );
}
