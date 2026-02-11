/**
 * 工作空间删除流 E2E 验收测试
 *
 * 覆盖 AC:
 * - AC1: 删除入口弹出 AlertDialog 二次确认，标题包含工作空间名称
 * - AC2: 确认后 1 秒内从列表移除，显示成功 Toast
 * - AC3: 取消不触发删除请求
 *
 * 注：AC10（删除失败回滚）需要网络故障模拟，无法在 No Mock 策略下通过 E2E 验证，由代码审查覆盖。
 *
 * 前置条件：
 * - 已执行 auth.setup.ts 生成认证状态文件
 * - 前端开发服务器运行中 (localhost:3000)
 * - 后端服务运行中 (localhost:8000)
 */

import { test, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

test.use({ storageState: authFile });

/**
 * 辅助函数：创建一个带唯一名称的工作空间
 */
async function createWorkspace(page: import("@playwright/test").Page, name: string) {
  // 点击「创建工作空间」按钮
  // 如果是空状态，按钮文本可能在 EmptyState 组件中
  const anyCreateButton = page.locator("button", { hasText: "创建工作空间" }).first();
  await anyCreateButton.click();

  // 填写工作空间名称
  const nameInput = page.getByPlaceholder("输入工作空间名称");
  await nameInput.fill(name);

  // 提交创建
  const submitButton = page.getByRole("button", { name: "创建" });
  await submitButton.click();

  // 等待工作空间卡片出现
  await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });
}

test.describe("工作空间删除流", () => {
  const uniqueSuffix = Date.now().toString(36);

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("我的工作空间")).toBeVisible({ timeout: 10_000 });
  });

  test("AC1: 点击删除入口弹出确认对话框，标题包含工作空间名称", async ({ page }) => {
    const wsName = `e2e-del-dialog-${uniqueSuffix}`;
    await createWorkspace(page, wsName);

    // 找到该工作空间卡片，打开三点菜单
    const card = page.locator(`[aria-label="工作空间：${wsName}"]`);
    await card.getByRole("button", { name: "工作空间操作" }).click();

    // 点击「删除工作空间」菜单项
    await page.getByText("删除工作空间").click();

    // 验证 AlertDialog 弹出，标题包含工作空间名称
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(wsName)).toBeVisible();

    // 验证有取消和确认按钮
    await expect(dialog.getByRole("button", { name: "取消" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "确认删除" })).toBeVisible();

    // 清理：取消对话框
    await dialog.getByRole("button", { name: "取消" }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("AC3: 取消删除不触发请求，工作空间保持不变", async ({ page }) => {
    const wsName = `e2e-del-cancel-${uniqueSuffix}`;
    await createWorkspace(page, wsName);

    // 监听网络请求，确认取消后不会发送 DELETE 请求
    let deleteRequestSent = false;
    page.on("request", (req) => {
      if (req.method() === "DELETE" && req.url().includes("/api/v1/workspaces/")) {
        deleteRequestSent = true;
      }
    });

    // 打开删除确认
    const card = page.locator(`[aria-label="工作空间：${wsName}"]`);
    await card.getByRole("button", { name: "工作空间操作" }).click();
    await page.getByText("删除工作空间").click();

    // 点击取消
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("button", { name: "取消" }).click();

    // 验证对话框关闭
    await expect(dialog).not.toBeVisible();

    // 验证工作空间仍在列表中
    await expect(page.getByText(wsName)).toBeVisible();

    // 验证没有发送 DELETE 请求
    expect(deleteRequestSent).toBe(false);
  });

  test("AC2: 确认删除后列表即时移除并显示成功 Toast", async ({ page }) => {
    const wsName = `e2e-del-confirm-${uniqueSuffix}`;
    await createWorkspace(page, wsName);

    // 打开删除确认
    const card = page.locator(`[aria-label="工作空间：${wsName}"]`);
    await card.getByRole("button", { name: "工作空间操作" }).click();
    await page.getByText("删除工作空间").click();

    // 确认删除
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("button", { name: "确认删除" }).click();

    // 验证工作空间从列表中移除（乐观更新应在 1 秒内完成）
    await expect(page.getByText(wsName)).not.toBeVisible({ timeout: 1_000 });

    // 验证成功 Toast 显示
    await expect(page.getByText("工作空间已删除")).toBeVisible({ timeout: 5_000 });
  });

  // AC10（删除失败回滚）需要网络故障场景，无法在不违反 No Mock 策略的前提下通过 E2E 验证。
  // 该 AC 的乐观回滚逻辑已在 TanStack Query onError 回调中实现，由代码审查覆盖。
});
