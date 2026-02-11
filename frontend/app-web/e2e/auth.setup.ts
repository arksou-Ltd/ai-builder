/**
 * 认证状态初始化脚本
 *
 * 交互式运行：打开浏览器，手动登录 Clerk，完成后自动保存认证状态。
 * 保存路径：e2e/.auth/user.json
 *
 * 运行方式：
 *   npx playwright test --project=setup
 *   或手动：npx playwright test e2e/auth.setup.ts --headed
 */

import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

setup("authenticate", async ({ page }) => {
  // 导航至 Dashboard（会被重定向到 Clerk 登录页）
  await page.goto("/dashboard");

  // 等待用户手动完成 Clerk 登录流程
  // Clerk 登录成功后会重定向到 /dashboard
  await page.waitForURL("**/dashboard**", { timeout: 120_000 });

  // 验证已登录：Dashboard 页面应展示「我的工作空间」
  await expect(page.getByText("我的工作空间")).toBeVisible({ timeout: 10_000 });

  // 保存认证状态（cookie + localStorage）
  await page.context().storageState({ path: authFile });
});
