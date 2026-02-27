/**
 * Playwright E2E 测试配置
 *
 * 前置条件：
 * 1. 后端服务运行中 (localhost:8001)
 * 2. 前端开发服务器运行中 (localhost:3001)
 *
 * 运行方式：
 *   首次：npx playwright test --project=setup --headed  (手动登录保存认证态)
 *   测试：npx playwright test --project=chromium         (运行 E2E 测试)
 *   交互：npx playwright test --ui                       (交互式模式)
 */

import { defineConfig, devices } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "e2e/.auth/user.json");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  timeout: 30_000,

  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // 认证初始化（交互式登录，保存 storage state）
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // 主测试（复用已保存的认证态）
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
      testIgnore: /auth\.setup\.ts/,
    },
  ],
});
