/**
 * 工作空间执行页壳层 E2E 测试
 *
 * 覆盖 AC:
 * - AC1: 三面板结构首屏渲染（顶部导航、左侧区域、中间对话区、右侧区域）
 * - AC2: >=1024px 布局稳定，面板互不覆盖
 * - AC3: 左侧折叠与焦点可达性
 * - AC4: 异常恢复与重试机制
 * - AC5: Workspace Settings 与 GitHub 区块入口
 *
 * 前置条件：
 * - 已执行 auth.setup.ts 生成认证状态文件
 * - 前端开发服务器运行中 (localhost:3000)
 * - 后端服务运行中 (localhost:8000)
 * - 至少存在一个工作空间
 */

import { test, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");
const TEXT = {
  dashboardTitle: /我的工作空间|My Workspaces/,
  createWorkspace: /创建工作空间|Create Workspace/,
  workspaceNamePlaceholder: /输入工作空间名称|Enter workspace name/,
  createAction: /^创建$|^Create$/,
  enterSpace: /进入空间|Enter Space/,
  workspaceActions: /工作空间操作|Workspace actions/,
  deleteWorkspace: /删除工作空间|Delete Workspace/,
  confirmDelete: /确认删除|Delete/,
  settings: /设置|Settings/,
  codeSources: /代码源|Code Sources/,
  authorizationStatus: /授权状态|Authorization Status/,
  retry: /重试|Retry/,
} as const;

test.use({ storageState: authFile });

/**
 * 辅助函数：创建工作空间并导航到执行页
 */
async function createAndNavigateToWorkspace(page: import("@playwright/test").Page) {
  // 先到 dashboard 创建一个工作空间
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: TEXT.dashboardTitle })).toBeVisible({
    timeout: 10_000,
  });

  const uniqueName = `e2e-shell-${Date.now().toString(36)}`;

  // 创建工作空间
  const createButton = page.getByRole("button", { name: TEXT.createWorkspace }).first();
  await createButton.click();
  await page.getByPlaceholder(TEXT.workspaceNamePlaceholder).fill(uniqueName);
  await page.getByRole("button", { name: TEXT.createAction }).click();
  await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10_000 });

  // 点击"进入空间"导航到执行页
  const card = page.locator(`[aria-label*="${uniqueName}"]`);
  const enterButton = card.getByRole("button", { name: TEXT.enterSpace });
  await enterButton.focus();
  await enterButton.click();

  // 等待执行页加载
  await page.waitForURL("**/workspace/**", { timeout: 10_000 });

  return uniqueName;
}

/**
 * 辅助函数：清理工作空间
 */
async function cleanupWorkspace(page: import("@playwright/test").Page, name: string) {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: TEXT.dashboardTitle })).toBeVisible({
    timeout: 10_000,
  });

  const card = page.locator(`[aria-label*="${name}"]`);
  if (await card.isVisible()) {
    await card.getByRole("button", { name: TEXT.workspaceActions }).click();
    await page.getByRole("menuitem", { name: TEXT.deleteWorkspace }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("button", { name: TEXT.confirmDelete }).click();
    await expect(page.getByText(name)).not.toBeVisible({ timeout: 5_000 });
  }
}

test.describe("工作空间执行页壳层", () => {
  test.describe.configure({ mode: "serial" });

  let workspaceName: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: authFile });
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    workspaceName = await createAndNavigateToWorkspace(page);
    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: authFile });
    const page = await context.newPage();
    await cleanupWorkspace(page, workspaceName);
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
  });

  test("AC1: 首屏加载显示三面板结构", async ({ page }) => {
    await page.goto(`/dashboard`);
    await expect(page.getByRole("heading", { name: TEXT.dashboardTitle })).toBeVisible({
      timeout: 10_000,
    });

    // 导航到执行页
    const card = page.locator(`[aria-label*="${workspaceName}"]`);
    await card.getByRole("button", { name: TEXT.enterSpace }).click();
    await page.waitForURL("**/workspace/**", { timeout: 10_000 });

    // 验证顶部导航存在
    const topNav = page.locator("header[role='banner']");
    await expect(topNav).toBeVisible();

    // 验证左侧导航区域存在（nav 语义）
    const leftPanel = page.locator("nav[aria-label]").first();
    await expect(leftPanel).toBeVisible();

    // 验证中间对话区存在（main 语义）
    const centerPanel = page.locator("main");
    await expect(centerPanel).toBeVisible();

    // 验证右侧区域存在（aside 语义）
    const rightPanel = page.locator("aside");
    await expect(rightPanel).toBeVisible();
  });

  test("AC2: >=1024px 布局稳定，面板互不覆盖", async ({ page }) => {
    await page.goto(`/dashboard`);
    await expect(page.getByRole("heading", { name: TEXT.dashboardTitle })).toBeVisible({
      timeout: 10_000,
    });
    const card = page.locator(`[aria-label*="${workspaceName}"]`);
    await card.getByRole("button", { name: TEXT.enterSpace }).click();
    await page.waitForURL("**/workspace/**", { timeout: 10_000 });

    // 验证壳层为三列 grid 布局
    const shell = page.getByTestId("workspace-shell-layout");
    await expect(shell).toBeVisible();
    await expect(shell).toHaveCSS("display", "grid");
    const gridColumns = await shell.evaluate((el) => window.getComputedStyle(el).gridTemplateColumns);
    expect(gridColumns.split(" ").length).toBe(3);

    // 获取三个面板的边界框
    const leftPanel = page.locator("nav[aria-label]").first();
    const centerPanel = page.locator("main");
    const rightPanel = page.locator("aside");

    const leftBox = await leftPanel.boundingBox();
    const centerBox = await centerPanel.boundingBox();
    const rightBox = await rightPanel.boundingBox();

    expect(leftBox).not.toBeNull();
    expect(centerBox).not.toBeNull();
    expect(rightBox).not.toBeNull();

    // 验证面板不重叠
    expect(leftBox!.x + leftBox!.width).toBeLessThanOrEqual(centerBox!.x + 2);
    expect(centerBox!.x + centerBox!.width).toBeLessThanOrEqual(rightBox!.x + 2);

    // 验证所有面板宽度 > 0
    expect(leftBox!.width).toBeGreaterThan(0);
    expect(centerBox!.width).toBeGreaterThan(0);
    expect(rightBox!.width).toBeGreaterThan(0);
  });

  test("AC3: 左侧折叠触发器可用且键盘可达", async ({ page }) => {
    await page.goto(`/dashboard`);
    await expect(page.getByRole("heading", { name: TEXT.dashboardTitle })).toBeVisible({
      timeout: 10_000,
    });
    const card = page.locator(`[aria-label*="${workspaceName}"]`);
    await card.getByRole("button", { name: TEXT.enterSpace }).click();
    await page.waitForURL("**/workspace/**", { timeout: 10_000 });

    // 查找折叠触发器
    const collapseButton = page.getByTestId("left-panel-toggle");
    await expect(collapseButton).toBeVisible();
    await expect(collapseButton).toHaveAttribute("aria-expanded", "true");

    // 验证按钮可通过键盘聚焦
    await collapseButton.focus();
    await expect(collapseButton).toBeFocused();

    // 点击折叠
    await collapseButton.click();

    // 验证左侧面板折叠（宽度接近 0）
    const leftPanel = page.locator("nav[aria-label]").first();
    const leftBoxAfter = await leftPanel.boundingBox();
    expect(leftBoxAfter!.width).toBeLessThanOrEqual(1);
    await expect(leftPanel).toHaveAttribute("aria-hidden", "true");
    await expect(collapseButton).toHaveAttribute("aria-expanded", "false");

    // 验证展开按钮出现
    const expandButton = page.getByTestId("left-panel-toggle");
    await expect(expandButton).toBeVisible();

    // 点击展开
    await expandButton.click();

    // 验证左侧面板恢复
    const leftBoxRestored = await leftPanel.boundingBox();
    expect(leftBoxRestored!.width).toBeGreaterThan(100);
    await expect(leftPanel).toHaveAttribute("aria-hidden", "false");
  });

  test("AC4: 异常时展示可恢复错误提示与重试入口", async ({ page }) => {
    // 导航到一个不存在的工作空间 ID 触发错误
    const missingWorkspaceId = "nonexistent-workspace-id";
    const requestUrlPath = `/api/v1/workspaces/${missingWorkspaceId}`;
    let requestCount = 0;
    const requestListener = (request: import("@playwright/test").Request) => {
      if (request.method() === "GET" && request.url().includes(requestUrlPath)) {
        requestCount += 1;
      }
    };

    page.on("request", requestListener);

    await page.goto(`/workspace/${missingWorkspaceId}`);
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

    // 验证错误提示存在
    const errorAlert = page.locator("[role='alert'], [data-testid='error-alert']");
    await expect(errorAlert).toBeVisible({ timeout: 10_000 });

    // 验证重试按钮存在
    const retryButton = page.locator("button", { hasText: TEXT.retry });
    await expect(retryButton).toBeVisible();
    const beforeRetry = requestCount;
    await retryButton.click();
    await expect.poll(() => requestCount, { timeout: 10_000 }).toBeGreaterThan(beforeRetry);

    // 验证页面主结构仍然可见（顶部导航）
    const topNav = page.locator("header[role='banner']");
    await expect(topNav).toBeVisible();

    page.off("request", requestListener);
  });

  test("AC5: 顶部导航提供 Settings 入口，展示 GitHub 区块", async ({ page }) => {
    await page.goto(`/dashboard`);
    await expect(page.getByRole("heading", { name: TEXT.dashboardTitle })).toBeVisible({
      timeout: 10_000,
    });
    const card = page.locator(`[aria-label*="${workspaceName}"]`);
    await card.getByRole("button", { name: TEXT.enterSpace }).click();
    await page.waitForURL("**/workspace/**", { timeout: 10_000 });

    // 验证顶部导航中存在 Settings 入口
    const settingsButton = page.locator("button", { hasText: TEXT.settings });
    await expect(settingsButton).toBeVisible();

    // 点击进入 Settings
    await settingsButton.click();

    // 验证 Code Sources 区块存在
    const codeSourcesSection = page.getByText(TEXT.codeSources);
    await expect(codeSourcesSection).toBeVisible({ timeout: 3_000 });

    // 验证 GitHub 信息卡存在
    const githubCard = page.locator("text=/GitHub/").first();
    await expect(githubCard).toBeVisible();

    // 验证授权状态显示
    const authStatus = page.getByText(TEXT.authorizationStatus);
    await expect(authStatus).toBeVisible();

    // 验证管理入口存在且指向 GitHub 管理页（避免依赖外网可达性）
    const manageButton = page.getByTestId("github-manage-button");
    await expect(manageButton).toBeEnabled();
    await expect(manageButton).toHaveAttribute(
      "href",
      /github\.com\/settings\/installations/,
    );
    await expect(manageButton).toHaveAttribute("target", "_blank");
    await expect(manageButton).toHaveAttribute("rel", /noopener/);
  });

  test("A11y: 关键交互元素键盘可达且 aria-label 生效", async ({ page }) => {
    await page.goto(`/dashboard`);
    await expect(page.getByRole("heading", { name: TEXT.dashboardTitle })).toBeVisible({
      timeout: 10_000,
    });
    const card = page.locator(`[aria-label*="${workspaceName}"]`);
    await card.getByRole("button", { name: TEXT.enterSpace }).click();
    await page.waitForURL("**/workspace/**", { timeout: 10_000 });

    // 验证折叠按钮有 aria-label 和 focus-visible 样式配置
    const collapseButton = page.getByTestId("left-panel-toggle");
    const ariaLabel = await collapseButton.getAttribute("aria-label");
    expect(ariaLabel).toBeTruthy();
    await expect(collapseButton).toHaveClass(/focus-visible:ring-2/);

    // 展开状态下：Shift+Tab 从折叠按钮应回到左侧首个可聚焦项
    const secondNavItem = page.getByTestId("left-nav-item-2");
    const firstNavItem = page.getByTestId("left-nav-item-1");
    await collapseButton.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(secondNavItem).toBeFocused();
    await expect(secondNavItem).toHaveClass(/focus-visible:ring-2/);
    await page.keyboard.press("Shift+Tab");
    await expect(firstNavItem).toBeFocused();

    // 再回到折叠按钮并执行折叠
    await page.keyboard.press("Tab");
    await expect(secondNavItem).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(collapseButton).toBeFocused();
    await collapseButton.click();

    // 折叠后：Tab 顺序应跳过左侧项，进入中间区可交互元素
    const centerAction = page.getByTestId("center-placeholder-action");
    await page.keyboard.press("Tab");
    await expect(centerAction).toBeFocused();

    // 验证 nav 元素有 aria-label
    const navLabel = await page.locator("nav[aria-label]").first().getAttribute("aria-label");
    expect(navLabel).toBeTruthy();

    // 验证 header 有 role="banner"
    const header = page.locator("header[role='banner']");
    await expect(header).toBeVisible();
  });
});
