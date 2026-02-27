/**
 * 工作流步骤面板 E2E 测试
 *
 * 覆盖 AC:
 * - AC1: 步骤面板展示 8 个核心步骤及状态图标
 * - AC2: 当前步骤高亮显示，已完成步骤显示勾选标记
 * - AC3: 状态变化后 1 秒内同步到界面
 * - AC4: 刷新恢复当前步骤与已完成状态
 *
 * 前置条件：
 * - 已执行 auth.setup.ts 生成认证状态文件
 * - 前端开发服务器运行中 (localhost:3001)
 * - 后端服务运行中 (localhost:8001)
 * - 至少存在一个工作空间
 *
 * No Mock Policy: 禁止 mock/stub/fake/spy 与网络拦截替身
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
  enterSpace: /进入空间|Enter Space/,
  workspaceActions: /工作空间操作|Workspace actions/,
  deleteWorkspace: /删除工作空间|Delete Workspace/,
  confirmDelete: /确认删除|Delete/,
  workflowStepsTitle: /工作流步骤|Workflow Steps/,
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
 * 辅助函数：创建工作空间并导航到执行页
 */
async function createAndNavigateToWorkspace(page: import("@playwright/test").Page) {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: TEXT.dashboardTitle })).toBeVisible({
    timeout: 10_000,
  });

  const uniqueName = `e2e-wf-${Date.now().toString(36)}`;

  const createButton = page.getByRole("button", { name: TEXT.createWorkspace }).first();
  await createButton.click();

  const createDialog = page.getByRole("dialog", { name: TEXT.createWorkspace });
  await expect(createDialog).toBeVisible({ timeout: 10_000 });

  // Clerk 会话刷新阶段可能触发对话框重挂载，导致输入值被清空；因此提交前后做显式校验与重试。
  let submitted = false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const nameInput = createDialog.getByPlaceholder(TEXT.workspaceNamePlaceholder);
    await nameInput.fill(uniqueName);
    await expect(nameInput).toHaveValue(uniqueName, { timeout: 3_000 });

    await createDialog.getByRole("button", { name: TEXT.createAction }).click({ force: true });
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
    throw new Error(`Create workspace dialog did not close after retries: ${uniqueName}`);
  }

  const card = await waitForWorkspaceCard(page, uniqueName);
  const enterButton = card.getByRole("button", { name: TEXT.enterSpace });
  await enterButton.click();
  await page.waitForURL("**/workspace/**", { timeout: 10_000 });

  return uniqueName;
}

function parseWorkspaceNameFromAriaLabel(label: string): string {
  const match = label.match(/[:：]\s*(.+)$/);
  if (match?.[1]) return match[1];
  return label;
}

/**
 * 辅助函数：清理工作空间
 */
async function cleanupWorkspace(page: import("@playwright/test").Page, name: string) {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: TEXT.dashboardTitle })).toBeVisible({
    timeout: 10_000,
  });

  const card = getWorkspaceCard(page, name);
  const isVisible = await card
    .waitFor({ state: "visible", timeout: 2_000 })
    .then(() => true)
    .catch(() => false);
  if (isVisible) {
    await card.getByRole("button", { name: TEXT.workspaceActions }).click();
    await page.getByRole("menuitem", { name: TEXT.deleteWorkspace }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("button", { name: TEXT.confirmDelete }).click();
    await expect(page.getByText(name)).not.toBeVisible({ timeout: 5_000 });
  }
}

/**
 * 辅助函数：导航到已有工作空间的执行页
 */
async function navigateToWorkspace(page: import("@playwright/test").Page, name: string) {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: TEXT.dashboardTitle })).toBeVisible({
    timeout: 10_000,
  });
  const card = await waitForWorkspaceCard(page, name);
  await card.getByRole("button", { name: TEXT.enterSpace }).click();
  await page.waitForURL("**/workspace/**", { timeout: 10_000 });
}

test.describe("工作流步骤面板", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(90_000);

  let workspaceName: string;
  let createdForThisRun = false;

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(120_000);
    const context = await browser.newContext({ storageState: authFile });
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: TEXT.dashboardTitle })).toBeVisible({
      timeout: 10_000,
    });

    const existingCard = page
      .locator('[aria-label*="Workspace:"], [aria-label*="工作空间："]')
      .first();
    const hasExisting = await existingCard
      .waitFor({ state: "visible", timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (hasExisting) {
      const ariaLabel = await existingCard.getAttribute("aria-label");
      if (!ariaLabel) {
        throw new Error("Workspace card aria-label is missing");
      }
      workspaceName = parseWorkspaceNameFromAriaLabel(ariaLabel);
      await context.close();
      return;
    }

    workspaceName = await createAndNavigateToWorkspace(page);
    createdForThisRun = true;
    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!createdForThisRun) return;

    const context = await browser.newContext({ storageState: authFile });
    const page = await context.newPage();
    await cleanupWorkspace(page, workspaceName);
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
  });

  test("AC1: 步骤面板展示 8 个核心步骤及状态图标", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    // 验证步骤面板存在
    const panel = page.getByTestId("workflow-steps-panel");
    await expect(panel).toBeVisible();

    // 验证面板标题
    await expect(panel.getByText(TEXT.workflowStepsTitle)).toBeVisible();

    // 验证固定 8 个步骤渲染
    const stepIds = [
      "drafting",
      "ux_design",
      "ui_preview",
      "doc_ready",
      "developing",
      "validating",
      "validated",
      "pr_pending",
    ];

    for (const stepId of stepIds) {
      const stepItem = page.getByTestId(`workflow-step-${stepId}`);
      await expect(stepItem).toBeVisible();
    }

    // 验证步骤总数为 8
    const allSteps = panel.locator("[data-testid^='workflow-step-']");
    await expect(allSteps).toHaveCount(8);

    // 验证每个步骤都有状态属性
    for (const stepId of stepIds) {
      const stepItem = page.getByTestId(`workflow-step-${stepId}`);
      const status = await stepItem.getAttribute("data-step-status");
      expect(["pending", "in_progress", "completed"]).toContain(status);
    }

    // 验证每个步骤包含 SVG 图标（非 emoji）
    for (const stepId of stepIds) {
      const stepItem = page.getByTestId(`workflow-step-${stepId}`);
      const svg = stepItem.locator("svg");
      await expect(svg).toBeVisible();
    }
  });

  test("AC1+: 1024px 最小桌面断点下步骤面板正常渲染", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await navigateToWorkspace(page, workspaceName);

    const panel = page.getByTestId("workflow-steps-panel");
    await expect(panel).toBeVisible();

    // 验证 8 个步骤在 1024px 下全部可见
    const allSteps = panel.locator("[data-testid^='workflow-step-']");
    await expect(allSteps).toHaveCount(8);

    // 验证面板在左侧区域内（不溢出）
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
    expect(panelBox!.width).toBeGreaterThan(100);
    expect(panelBox!.width).toBeLessThan(300);
  });

  test("AC2: 当前步骤高亮与已完成步骤勾选", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    // 通过 Zustand store 设置当前步骤为 developing（第 5 步）
    // 这会使前 4 步自动收敛为 completed
    await page.evaluate(() => {
      // 从 URL 提取 workspaceId
      const pathParts = window.location.pathname.split("/");
      const workspaceId = pathParts[pathParts.length - 1];

      // 直接操作 localStorage 中的 Zustand 持久化数据
      const storeKey = "ai-builder-workflow-steps";
      const stored = localStorage.getItem(storeKey);
      const data = stored ? JSON.parse(stored) : { state: { workspaces: {} }, version: 0 };

      data.state.workspaces[workspaceId] = {
        steps: [
          { stepId: "drafting", status: "completed" },
          { stepId: "ux_design", status: "completed" },
          { stepId: "ui_preview", status: "completed" },
          { stepId: "doc_ready", status: "completed" },
          { stepId: "developing", status: "in_progress" },
          { stepId: "validating", status: "pending" },
          { stepId: "validated", status: "pending" },
          { stepId: "pr_pending", status: "pending" },
        ],
        currentStepId: "developing",
        version: 1,
      };

      localStorage.setItem(storeKey, JSON.stringify(data));
    });

    // 刷新页面以从 localStorage 恢复状态
    await page.reload();
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

    const panel = page.getByTestId("workflow-steps-panel");
    await expect(panel).toBeVisible();

    // 验证已完成步骤（前 4 步）显示 completed 状态
    const completedSteps = ["drafting", "ux_design", "ui_preview", "doc_ready"];
    for (const stepId of completedSteps) {
      const stepItem = page.getByTestId(`workflow-step-${stepId}`);
      await expect(stepItem).toHaveAttribute("data-step-status", "completed");
    }

    // 验证当前步骤高亮（developing）
    const currentStep = page.getByTestId("workflow-step-developing");
    await expect(currentStep).toHaveAttribute("data-step-status", "in_progress");
    await expect(currentStep).toHaveAttribute("aria-current", "step");

    // 验证待执行步骤（后 3 步）
    const pendingSteps = ["validating", "validated", "pr_pending"];
    for (const stepId of pendingSteps) {
      const stepItem = page.getByTestId(`workflow-step-${stepId}`);
      await expect(stepItem).toHaveAttribute("data-step-status", "pending");
    }
  });

  test("AC3: 状态变化后 1 秒内同步到界面", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    const panel = page.getByTestId("workflow-steps-panel");
    await expect(panel).toBeVisible();

    // 在浏览器上下文内计时，避免将 Playwright RPC 往返耗时混入 SLA 统计
    const elapsedMs = await page.evaluate(async () => {
      const target = document.querySelector<HTMLElement>(
        "[data-testid='workflow-step-validating']",
      );
      if (!target) return Number.POSITIVE_INFINITY;

      const startedAt = performance.now();

      return await new Promise<number>((resolve) => {
        const readStatus = () => target.getAttribute("data-step-status");
        const finish = () => resolve(performance.now() - startedAt);

        const observer = new MutationObserver(() => {
          if (readStatus() === "in_progress") {
            observer.disconnect();
            finish();
          }
        });

        observer.observe(target, {
          attributes: true,
          attributeFilter: ["data-step-status"],
        });

        window.dispatchEvent(
          new CustomEvent("workflow.step", {
            detail: { step: "validating", status: "in_progress" },
          }),
        );

        if (readStatus() === "in_progress") {
          observer.disconnect();
          finish();
          return;
        }

        window.setTimeout(() => {
          observer.disconnect();
          resolve(Number.POSITIVE_INFINITY);
        }, 1_000);
      });
    });

    expect(elapsedMs).toBeLessThanOrEqual(1_000);

    // 验证 validating 步骤变为 in_progress
    const validatingStep = page.getByTestId("workflow-step-validating");
    await expect(validatingStep).toHaveAttribute("data-step-status", "in_progress", {
      timeout: 1_000,
    });

    // 验证 developing 步骤变为 completed
    const developingStep = page.getByTestId("workflow-step-developing");
    await expect(developingStep).toHaveAttribute("data-step-status", "completed", {
      timeout: 1_000,
    });
  });

  test("AC4: 刷新恢复当前步骤与已完成状态", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    // 设置特定状态
    await page.evaluate(() => {
      const pathParts = window.location.pathname.split("/");
      const workspaceId = pathParts[pathParts.length - 1];

      const storeKey = "ai-builder-workflow-steps";
      const stored = localStorage.getItem(storeKey);
      const data = stored ? JSON.parse(stored) : { state: { workspaces: {} }, version: 0 };

      data.state.workspaces[workspaceId] = {
        steps: [
          { stepId: "drafting", status: "completed" },
          { stepId: "ux_design", status: "completed" },
          { stepId: "ui_preview", status: "in_progress" },
          { stepId: "doc_ready", status: "pending" },
          { stepId: "developing", status: "pending" },
          { stepId: "validating", status: "pending" },
          { stepId: "validated", status: "pending" },
          { stepId: "pr_pending", status: "pending" },
        ],
        currentStepId: "ui_preview",
        version: 1,
      };

      localStorage.setItem(storeKey, JSON.stringify(data));
    });

    // 执行浏览器刷新
    await page.reload();
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

    const panel = page.getByTestId("workflow-steps-panel");
    await expect(panel).toBeVisible();

    // 验证刷新后状态恢复正确
    await expect(page.getByTestId("workflow-step-drafting")).toHaveAttribute(
      "data-step-status",
      "completed",
    );
    await expect(page.getByTestId("workflow-step-ux_design")).toHaveAttribute(
      "data-step-status",
      "completed",
    );
    await expect(page.getByTestId("workflow-step-ui_preview")).toHaveAttribute(
      "data-step-status",
      "in_progress",
    );
    await expect(page.getByTestId("workflow-step-ui_preview")).toHaveAttribute(
      "aria-current",
      "step",
    );
    await expect(page.getByTestId("workflow-step-doc_ready")).toHaveAttribute(
      "data-step-status",
      "pending",
    );
  });

  test("AC4+: 持久化数据损坏时自动回退默认状态", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    await page.evaluate(() => {
      const pathParts = window.location.pathname.split("/");
      const workspaceId = pathParts[pathParts.length - 1];
      const storeKey = "ai-builder-workflow-steps";
      const stored = localStorage.getItem(storeKey);
      const data = stored ? JSON.parse(stored) : { state: { workspaces: {} }, version: 0 };

      data.state.workspaces[workspaceId] = {
        steps: [
          { stepId: "drafting", status: "completed" },
          { stepId: "ux_design", status: "broken_status" },
          { stepId: "ui_preview", status: "pending" },
          { stepId: "doc_ready", status: "pending" },
          { stepId: "developing", status: "pending" },
          { stepId: "validating", status: "pending" },
          { stepId: "validated", status: "pending" },
          { stepId: "pr_pending", status: "pending" },
        ],
        currentStepId: "unknown_step",
        version: 1,
      };

      localStorage.setItem(storeKey, JSON.stringify(data));
    });

    await page.reload();
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

    const panel = page.getByTestId("workflow-steps-panel");
    await expect(panel).toBeVisible();

    // 数据损坏后应回退默认状态：全部 pending，且无 aria-current
    const allSteps = panel.locator("[data-testid^='workflow-step-']");
    const count = await allSteps.count();
    for (let i = 0; i < count; i++) {
      await expect(allSteps.nth(i)).toHaveAttribute("data-step-status", "pending");
    }
    await expect(panel.locator("[aria-current='step']")).toHaveCount(0);
  });

  test("AC4+: 不同工作空间状态隔离，不串状态", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    // 设置当前工作空间的状态
    const currentWorkspaceId = await page.evaluate(() => {
      const pathParts = window.location.pathname.split("/");
      return pathParts[pathParts.length - 1];
    });

    await page.evaluate((wsId: string) => {
      const storeKey = "ai-builder-workflow-steps";
      const stored = localStorage.getItem(storeKey);
      const data = stored ? JSON.parse(stored) : { state: { workspaces: {} }, version: 0 };

      // 设置当前工作空间状态
      data.state.workspaces[wsId] = {
        steps: [
          { stepId: "drafting", status: "completed" },
          { stepId: "ux_design", status: "in_progress" },
          { stepId: "ui_preview", status: "pending" },
          { stepId: "doc_ready", status: "pending" },
          { stepId: "developing", status: "pending" },
          { stepId: "validating", status: "pending" },
          { stepId: "validated", status: "pending" },
          { stepId: "pr_pending", status: "pending" },
        ],
        currentStepId: "ux_design",
        version: 1,
      };

      // 设置另一个工作空间的不同状态
      data.state.workspaces["other-workspace-id"] = {
        steps: [
          { stepId: "drafting", status: "completed" },
          { stepId: "ux_design", status: "completed" },
          { stepId: "ui_preview", status: "completed" },
          { stepId: "doc_ready", status: "completed" },
          { stepId: "developing", status: "completed" },
          { stepId: "validating", status: "completed" },
          { stepId: "validated", status: "completed" },
          { stepId: "pr_pending", status: "in_progress" },
        ],
        currentStepId: "pr_pending",
        version: 1,
      };

      localStorage.setItem(storeKey, JSON.stringify(data));
    }, currentWorkspaceId);

    await page.reload();
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

    // 验证当前工作空间显示的是自己的状态，不是其他工作空间的状态
    await expect(page.getByTestId("workflow-step-ux_design")).toHaveAttribute(
      "data-step-status",
      "in_progress",
    );
    await expect(page.getByTestId("workflow-step-pr_pending")).toHaveAttribute(
      "data-step-status",
      "pending",
    );
  });

  test("A11y: 键盘导航顺序、可见焦点与状态播报", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    const panel = page.getByTestId("workflow-steps-panel");
    await expect(panel).toBeVisible();

    // 验证面板使用 nav 语义标签（panel 本身是 nav 元素）
    const tagName = await panel.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe("nav");

    // 验证面板有 aria-label
    const ariaLabel = await panel.getAttribute("aria-label");
    expect(ariaLabel).toBeTruthy();

    // 验证步骤列表使用有序列表
    const ol = panel.locator("ol");
    await expect(ol).toBeVisible();

    // 验证 aria-live 区域存在（用于状态变化播报）
    const liveRegion = page.getByTestId("workflow-steps-live-region");
    await expect(liveRegion).toBeAttached();
    const ariaLive = await liveRegion.getAttribute("aria-live");
    expect(ariaLive).toBe("polite");

    // 验证当前步骤有 aria-current="step"（如果有当前步骤）
    const stepsWithAriaCurrent = panel.locator("[aria-current='step']");
    const count = await stepsWithAriaCurrent.count();
    // 可能为 0（全部 pending）或 1（有当前步骤）
    expect(count).toBeLessThanOrEqual(1);

    // 验证每个步骤的图标有 aria-hidden（装饰性图标）
    const allSteps = panel.locator("[data-testid^='workflow-step-']");
    const stepCount = await allSteps.count();
    for (let i = 0; i < stepCount; i++) {
      const step = allSteps.nth(i);
      const iconSpan = step.locator("span[aria-hidden='true']").first();
      await expect(iconSpan).toBeAttached();
    }

    // 验证每个步骤有 sr-only 状态文案
    for (let i = 0; i < stepCount; i++) {
      const step = allSteps.nth(i);
      const srOnly = step.locator(".sr-only");
      await expect(srOnly).toBeAttached();
    }

    // 验证步骤项可通过键盘 Tab 聚焦（tabIndex=0）
    const firstStep = page.getByTestId("workflow-step-drafting");
    await firstStep.focus();
    const focusedTag = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.getAttribute("data-testid") : null;
    });
    expect(focusedTag).toBe("workflow-step-drafting");

    // 验证通过 Tab 键可在步骤间依序导航
    const stepIds = [
      "drafting",
      "ux_design",
      "ui_preview",
      "doc_ready",
      "developing",
      "validating",
      "validated",
      "pr_pending",
    ];

    // 聚焦第一个步骤后，Tab 键应按顺序切换到后续步骤
    await firstStep.focus();
    for (let i = 1; i < stepIds.length; i++) {
      await page.keyboard.press("Tab");
      const currentFocusTestId = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? el.getAttribute("data-testid") : null;
      });
      expect(currentFocusTestId).toBe(`workflow-step-${stepIds[i]}`);
    }

    // 验证 focus-visible 样式可用（聚焦时有 outline/ring 样式）
    await firstStep.focus();
    // 使用键盘触发 focus-visible（Tab 到第一个步骤）
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    const outlineStyle = await firstStep.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.outlineStyle;
    });
    // focus-visible 应设置 outline 或 ring（Tailwind ring 通过 box-shadow 实现）
    const boxShadow = await firstStep.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.boxShadow;
    });
    // 验证聚焦时有可见的视觉指示（outline 或 box-shadow）
    const hasFocusIndicator = outlineStyle !== "none" || boxShadow !== "none";
    expect(hasFocusIndicator).toBe(true);
  });
});
