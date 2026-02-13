import { defineRouting } from "next-intl/routing";

/**
 * 国际化路由配置
 *
 * - 支持语言：zh-CN（默认）、en
 * - URL 策略：never（URL 中不出现语言前缀，语言通过 cookie 管理）
 *   - /dashboard → 中文或英文（取决于 cookie）
 */
export const routing = defineRouting({
  locales: ["zh-CN", "en"],
  defaultLocale: "zh-CN",
  localePrefix: "never",
});
