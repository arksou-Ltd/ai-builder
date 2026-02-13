import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * 国际化感知的导航 API
 *
 * 替代 next/link、next/navigation 的对应导出，
 * 自动处理 locale 前缀。
 */
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
