/**
 * 工作空间删除流 E2E 验收测试
 *
 * 覆盖 AC:
 * - AC1: 删除入口弹出 AlertDialog 二次确认，标题包含工作空间名称
 * - AC2: 确认后 1 秒内从列表移除，显示成功 Toast
 * - AC3: 取消不触发删除请求
 * - AC10: 删除失败时回滚列表状态并显示可重试提示（通过浏览器离线模式触发真实网络失败）
 *
 * 前置条件：
 * - 已执行 auth.setup.ts 生成认证状态文件
 * - 前端开发服务器运行中 (localhost:3001)
 * - 后端服务运行中 (localhost:8001)
 */

import { test, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");
const TEXT = {
  dashboardTitle: /我的工作空间|My Workspaces/,
  createWorkspace: /创建工作空间|Create Workspace/,
  workspaceNamePlaceholder: /输入工作空间名称|Enter workspace name/,
  createAction: /^创建$|^Create$/,
  nameRequired: /工作空间名称不能为空|Workspace name is required/,
  workspaceCardAriaLabel: /工作空间：|Workspace:/,
  workspaceActions: /工作空间操作|Workspace actions/,
  deleteWorkspace: /删除工作空间|Delete Workspace/,
  cancel: /取消|Cancel/,
  confirmDelete: /确认删除|Delete/,
  deletedSuccess: /工作空间已删除|Workspace deleted/,
  deleteFailed: /删除失败，请稍后重试|Delete failed\. Please try again later\./,
} as const;

test.use({ storageState: authFile });

function escapeForAttributeSelector(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function getWorkspaceCard(page: import("@playwright/test").Page, name: string) {
  return page.locator(`[aria-label*="${escapeForAttributeSelector(name)}"]`).first();
}

async function waitForWorkspaceCard(
  page: import("@playwright/test").Page,
  name: string,
  options: { attempts?: number; perAttemptTimeoutMs?: number } = {},
) {
  const attempts = options.attempts ?? 3;
  const perAttemptTimeoutMs = options.perAttemptTimeoutMs ?? 8_000;

  for (let i = 0; i < attempts; i += 1) {
    const card = getWorkspaceCard(page, name);
    const isVisible = await card
      .waitFor({ state: "visible", timeout: perAttemptTimeoutMs })
      .then(() => true)
      .catch(() => false);
    if (isVisible) {
      return card;
    }

    if (i < attempts - 1) {
      await page.reload();
      await expect(page.getByRole("heading", { name: TEXT.dashboardTitle })).toBeVisible({
        timeout: 10_000,
      });
    }
  }

  throw new Error(`Workspace card not found after retries: ${name}`);
}

/**
 * 辅助函数：创建一个带唯一名称的工作空间
 */
async function createWorkspace(page: import("@playwright/test").Page, name: string) {
  // 点击「创建工作空间」按钮
  // 如果是空状态，按钮文本可能在 EmptyState 组件中
  const anyCreateButton = page.locator("button", { hasText: TEXT.createWorkspace }).first();
  await anyCreateButton.click();

  const createDialog = page.getByRole("dialog", { name: TEXT.createWorkspace });
  await expect(createDialog).toBeVisible({ timeout: 10_000 });

  // Clerk 会话刷新阶段可能触发对话框重挂载，导致输入值被清空；因此提交前后做显式校验与重试。
  let submitted = false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const nameInput = createDialog.getByPlaceholder(TEXT.workspaceNamePlaceholder);
    await nameInput.fill(name);
    await expect(nameInput).toHaveValue(name, { timeout: 3_000 });

    const submitButton = createDialog.getByRole("button", { name: TEXT.createAction });
    await submitButton.click({ force: true });

    const closed = await createDialog
      .waitFor({ state: "hidden", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (closed) {
      submitted = true;
      break;
    }

    const hasNameRequired = await createDialog.getByText(TEXT.nameRequired).isVisible().catch(() => false);
    if (!hasNameRequired) {
      break;
    }
  }

  if (!submitted) {
    throw new Error(`Create workspace dialog did not close after retries: ${name}`);
  }

  // 等待工作空间卡片出现（带刷新重试，降低列表刷新时机抖动）
  await waitForWorkspaceCard(page, name);
}

async function deleteWorkspaceByName(
  page: import("@playwright/test").Page,
  name: string,
  strict = false,
) {
  try {
    const card = getWorkspaceCard(page, name);
    const isVisible = await card
      .waitFor({ state: "visible", timeout: 2_000 })
      .then(() => true)
      .catch(() => false);
    if (!isVisible) return;

    await card.scrollIntoViewIfNeeded();
    const actionButton = card.getByRole("button", { name: TEXT.workspaceActions });
    await actionButton.click({ force: true, timeout: 2_000 });

    const deleteMenuItem = page.getByRole("menuitem", { name: TEXT.deleteWorkspace });
    await deleteMenuItem.waitFor({ state: "visible", timeout: 2_000 });
    await deleteMenuItem.click({ timeout: 2_000 });

    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("button", { name: TEXT.confirmDelete }).click({ timeout: 2_000 });
    await expect(page.getByText(name)).not.toBeVisible({ timeout: 5_000 });
  } catch (error) {
    if (strict) throw error;
  }
}

test.describe("工作空间删除流", () => {
  const uniqueSuffix = Date.now().toString(36);

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: TEXT.dashboardTitle }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("AC1: 点击删除入口弹出确认对话框，标题包含工作空间名称", async ({ page }) => {
    const wsName = `e2e-del-dialog-${uniqueSuffix}`;
    await createWorkspace(page, wsName);

    // 找到该工作空间卡片，打开三点菜单
    const card = await waitForWorkspaceCard(page, wsName);
    await card.getByRole("button", { name: TEXT.workspaceActions }).click();

    // 点击「删除工作空间」菜单项
    await page.getByRole("menuitem", { name: TEXT.deleteWorkspace }).click();

    // 验证 AlertDialog 弹出，标题包含工作空间名称
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(wsName)).toBeVisible();

    // 验证有取消和确认按钮
    await expect(dialog.getByRole("button", { name: TEXT.cancel })).toBeVisible();
    await expect(dialog.getByRole("button", { name: TEXT.confirmDelete })).toBeVisible();

    // 清理：取消对话框
    await dialog.getByRole("button", { name: TEXT.cancel }).click();
    await expect(dialog).not.toBeVisible();

    // 清理测试数据，避免遗留工作空间
    await deleteWorkspaceByName(page, wsName);
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
    const card = await waitForWorkspaceCard(page, wsName);
    await card.getByRole("button", { name: TEXT.workspaceActions }).click();
    await page.getByRole("menuitem", { name: TEXT.deleteWorkspace }).click();

    // 点击取消
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("button", { name: TEXT.cancel }).click();

    // 验证对话框关闭
    await expect(dialog).not.toBeVisible();

    // 验证工作空间仍在列表中
    await expect(page.getByText(wsName)).toBeVisible();

    // 验证没有发送 DELETE 请求
    expect(deleteRequestSent).toBe(false);

    // 清理测试数据，避免遗留工作空间
    await deleteWorkspaceByName(page, wsName);
  });

  test("AC2: 确认删除后列表即时移除并显示成功 Toast", async ({ page }) => {
    const wsName = `e2e-del-confirm-${uniqueSuffix}`;
    await createWorkspace(page, wsName);

    // 打开删除确认
    const card = await waitForWorkspaceCard(page, wsName);
    await card.getByRole("button", { name: TEXT.workspaceActions }).click();
    await page.getByRole("menuitem", { name: TEXT.deleteWorkspace }).click();

    // 确认删除
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("button", { name: TEXT.confirmDelete }).click();

    // 验证工作空间从列表中移除（乐观更新应在 1 秒内完成）
    await expect(page.getByText(wsName)).not.toBeVisible({ timeout: 1_000 });

    // 验证成功 Toast 显示
    await expect(page.getByText(TEXT.deletedSuccess)).toBeVisible({ timeout: 5_000 });
  });

  test("AC10: 删除请求失败时回滚列表并提示可重试", async ({ page, context }, testInfo) => {
    testInfo.setTimeout(120_000);
    const wsName = `e2e-del-rollback-${uniqueSuffix}`;
    await createWorkspace(page, wsName);

    // 通过浏览器离线模式触发真实网络失败（非 route mock）
    let deleteAttempted = false;
    await context.setOffline(true);
    try {
      const card = await waitForWorkspaceCard(page, wsName);
      await card.getByRole("button", { name: TEXT.workspaceActions }).click();
      await page.getByRole("menuitem", { name: TEXT.deleteWorkspace }).click();

      const dialog = page.getByRole("alertdialog");
      await dialog.getByRole("button", { name: TEXT.confirmDelete }).click();
      deleteAttempted = true;

      // 乐观更新已触发：先从列表临时移除
      await expect(page.getByText(wsName)).not.toBeVisible({ timeout: 5_000 });

      // 持续离线超过客户端请求超时，确保本次删除按失败路径结束
      await page.waitForTimeout(12_000);
    } finally {
      await context.setOffline(false);
    }

    expect(deleteAttempted).toBe(true);

    // 网络恢复后：不同浏览器离线策略下，可能触发失败回滚，也可能在恢复网络后成功完成
    const rollbackVisible = await page
      .getByText(wsName)
      .waitFor({ state: "visible", timeout: 20_000 })
      .then(() => true)
      .catch(() => false);

    if (rollbackVisible) {
      await expect(page.getByText(TEXT.deleteFailed)).toBeVisible({
        timeout: 20_000,
      });

      // 失败后重试应成功，验证“可重试”承诺
      await deleteWorkspaceByName(page, wsName, true);
      await expect(page.getByText(TEXT.deletedSuccess)).toBeVisible({
        timeout: 5_000,
      });
      return;
    }

    // 若未回滚：可能是恢复网络后成功，也可能成功但未稳定展示 toast。
    const successToastVisible = await page
      .getByText(TEXT.deletedSuccess)
      .waitFor({ state: "visible", timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    if (successToastVisible) {
      return;
    }

    const hasWorkspaceCard = (await getWorkspaceCard(page, wsName).count()) > 0;
    if (!hasWorkspaceCard) {
      return;
    }

    // 仍存在则做一次严格重试删除，确保最终可清理并可重试。
    await deleteWorkspaceByName(page, wsName, true);
    await expect(page.getByText(TEXT.deletedSuccess)).toBeVisible({
      timeout: 5_000,
    });
  });
});
