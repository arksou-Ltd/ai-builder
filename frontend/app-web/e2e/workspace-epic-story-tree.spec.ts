/**
 * Epic/Story 导航树 E2E 测试
 *
 * 覆盖 AC:
 * - AC1: Epic 展开后 Story 列表与状态标签显示
 * - AC2: Story 切换后中间与右侧区域同步更新（1 秒内）
 * - AC3: 未解锁 Story 禁止选中
 * - AC4: 展开折叠动效时长断言（150-300ms）
 *
 * 前置条件：
 * - 已执行 auth.setup.ts 生成认证状态文件
 * - 前端开发服务器运行中 (localhost:3000)
 * - 后端服务运行中 (localhost:8000)
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
  storyTreeTitle: /需求导航|Requirements/,
  statusBacklog: /待开发|Backlog/,
  statusInProgress: /开发中|In Progress/,
  statusReview: /Review中|In Review/,
  statusDone: /已完成|Done/,
} as const;

test.use({ storageState: authFile });

function getWorkspaceCard(
  page: import("@playwright/test").Page,
  name: string,
) {
  return page.locator(`[aria-label*="${name}"]`);
}

async function waitForWorkspaceCard(
  page: import("@playwright/test").Page,
  name: string,
  attempts = 3,
) {
  for (let i = 0; i < attempts; i += 1) {
    const card = getWorkspaceCard(page, name);
    const visible = await card
      .first()
      .waitFor({ state: "visible", timeout: 4_000 })
      .then(() => true)
      .catch(() => false);

    if (visible) {
      return card.first();
    }

    if (i < attempts - 1) {
      await page.reload();
      await expect(
        page.getByRole("heading", { name: TEXT.dashboardTitle }),
      ).toBeVisible({ timeout: 10_000 });
    }
  }

  throw new Error(`Workspace card not found after retries: ${name}`);
}

/**
 * 辅助函数：创建工作空间并导航到执行页
 */
async function createAndNavigateToWorkspace(
  page: import("@playwright/test").Page,
) {
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: TEXT.dashboardTitle }),
  ).toBeVisible({ timeout: 10_000 });

  const uniqueName = `e2e-tree-${Date.now().toString(36)}`;

  const createButton = page
    .getByRole("button", { name: TEXT.createWorkspace })
    .first();
  await createButton.click();

  const createDialog = page.getByRole("dialog", {
    name: TEXT.createWorkspace,
  });
  await expect(createDialog).toBeVisible({ timeout: 10_000 });

  // Clerk 会话刷新阶段可能触发对话框重挂载，导致输入值被清空；提交前后做显式校验与重试。
  let submitted = false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const nameInput = createDialog.getByPlaceholder(
      TEXT.workspaceNamePlaceholder,
    );
    await nameInput.fill(uniqueName);
    await expect(nameInput).toHaveValue(uniqueName, { timeout: 3_000 });

    await createDialog
      .getByRole("button", { name: TEXT.createAction })
      .click({ force: true });

    const closed = await createDialog
      .waitFor({ state: "hidden", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (closed) {
      submitted = true;
      break;
    }

    const hasNameRequired = await createDialog
      .getByText(TEXT.nameRequired)
      .isVisible()
      .catch(() => false);
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

/**
 * 辅助函数：清理工作空间
 */
async function cleanupWorkspace(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: TEXT.dashboardTitle }),
  ).toBeVisible({ timeout: 10_000 });

  const card = getWorkspaceCard(page, name);
  if (await card.isVisible()) {
    await card
      .getByRole("button", { name: TEXT.workspaceActions })
      .click();
    await page
      .getByRole("menuitem", { name: TEXT.deleteWorkspace })
      .click();
    const dialog = page.getByRole("alertdialog");
    await dialog
      .getByRole("button", { name: TEXT.confirmDelete })
      .click();
    await expect(page.getByText(name)).not.toBeVisible({ timeout: 5_000 });
  }
}

/**
 * 辅助函数：导航到已有工作空间的执行页
 */
async function navigateToWorkspace(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: TEXT.dashboardTitle }),
  ).toBeVisible({ timeout: 10_000 });
  const card = getWorkspaceCard(page, name);
  await card.getByRole("button", { name: TEXT.enterSpace }).click();
  await page.waitForURL("**/workspace/**", { timeout: 10_000 });
}

test.describe("Epic/Story 导航树", () => {
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
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("AC1: Epic 展开后 Story 列表与状态标签显示", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    // 验证导航树标题存在
    await expect(page.getByText(TEXT.storyTreeTitle)).toBeVisible();

    // 验证 tree role 存在
    const tree = page.locator('[role="tree"]');
    await expect(tree).toBeVisible();

    // 验证有 Epic 节点（treeitem with aria-expanded）
    const epicItems = tree.locator(
      '[role="treeitem"][aria-expanded]',
    );
    const epicCount = await epicItems.count();
    expect(epicCount).toBeGreaterThan(0);

    // 点击展开第一个 Epic（如果未展开）
    const firstEpic = epicItems.first();
    const isExpanded =
      (await firstEpic.getAttribute("aria-expanded")) === "true";
    if (!isExpanded) {
      await firstEpic.locator("button").first().click();
    }

    // 等待展开动画完成
    await page.waitForTimeout(300);

    // 验证 Story 列表可见（子 treeitem）
    const storyItems = firstEpic.locator(
      '[role="treeitem"][aria-selected]',
    );
    const storyCount = await storyItems.count();
    expect(storyCount).toBeGreaterThan(0);

    // 验证每个 Story 有状态标签（待开发/开发中/Review中/已完成）
    for (let i = 0; i < storyCount; i++) {
      const story = storyItems.nth(i);
      const storyText = await story.textContent();
      expect(storyText).toBeTruthy();

      // 验证有状态文本
      const hasStatusLabel =
        TEXT.statusBacklog.test(storyText!) ||
        TEXT.statusInProgress.test(storyText!) ||
        TEXT.statusReview.test(storyText!) ||
        TEXT.statusDone.test(storyText!);
      expect(hasStatusLabel).toBe(true);
    }

    // 验证每个 Story 有 SVG 状态图标
    for (let i = 0; i < storyCount; i++) {
      const story = storyItems.nth(i);
      const svg = story.locator("svg");
      await expect(svg).toBeVisible();
    }
  });

  test("AC1+: 1024px 最小桌面断点下导航树正常渲染", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await navigateToWorkspace(page, workspaceName);

    // 验证导航树存在
    const tree = page.locator('[role="tree"]');
    await expect(tree).toBeVisible();

    // 验证 Epic 节点可见
    const epicItems = tree.locator(
      '[role="treeitem"][aria-expanded]',
    );
    const epicCount = await epicItems.count();
    expect(epicCount).toBeGreaterThan(0);
  });

  test("AC2: Story 切换后中间与右侧区域同步更新", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    const tree = page.locator('[role="tree"]');
    await expect(tree).toBeVisible();

    // 确保有 Epic 展开
    const epicItems = tree.locator(
      '[role="treeitem"][aria-expanded]',
    );
    const firstEpic = epicItems.first();
    const isExpanded =
      (await firstEpic.getAttribute("aria-expanded")) === "true";
    if (!isExpanded) {
      await firstEpic.locator("button").first().click();
      await page.waitForTimeout(300);
    }

    // 找到第一个可选中的 Story（未锁定）
    const selectableStory = firstEpic.locator(
      '[role="treeitem"][aria-disabled="false"], [role="treeitem"]:not([aria-disabled="true"])',
    );
    const selectableCount = await selectableStory.count();
    expect(selectableCount).toBeGreaterThan(0);

    // 在浏览器上下文内计时 Story 选中同步
    const elapsedMs = await page.evaluate(async () => {
      // 找到第一个可选中的 Story
      const stories = document.querySelectorAll<HTMLElement>(
        '[role="treeitem"][data-story-id]:not([aria-disabled="true"])',
      );
      if (stories.length === 0) return Number.POSITIVE_INFINITY;

      const story = stories[0];
      const storyId = story.dataset.storyId;
      if (!storyId) return Number.POSITIVE_INFINITY;

      const startedAt = performance.now();

      return await new Promise<number>((resolve) => {
        const observer = new MutationObserver(() => {
          const ctx = document.querySelector(
            '[data-testid="selected-story-context"]',
          );
          if (ctx) {
            observer.disconnect();
            resolve(performance.now() - startedAt);
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });

        // 点击 Story
        story.click();

        // 如果已经有上下文，立即返回
        const existingCtx = document.querySelector(
          '[data-testid="selected-story-context"]',
        );
        if (existingCtx) {
          observer.disconnect();
          resolve(performance.now() - startedAt);
          return;
        }

        // 1 秒超时
        window.setTimeout(() => {
          observer.disconnect();
          resolve(Number.POSITIVE_INFINITY);
        }, 1_000);
      });
    });

    expect(elapsedMs).toBeLessThanOrEqual(1_000);

    // 验证中间区域显示选中 Story 上下文
    const centerContext = page.getByTestId("selected-story-context");
    await expect(centerContext).toBeVisible({ timeout: 1_000 });

    // 验证右侧 progress Tab 显示选中 Story 上下文
    const progressContext = page.getByTestId("progress-story-context");
    await expect(progressContext).toBeVisible({ timeout: 1_000 });

    // 验证选中 Story 有 aria-selected="true"
    const selectedStory = tree.locator(
      '[role="treeitem"][aria-selected="true"][data-story-id]',
    );
    await expect(selectedStory).toHaveCount(1);
  });

  test("AC3: 未解锁 Story 禁止选中", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    const tree = page.locator('[role="tree"]');
    await expect(tree).toBeVisible();

    // 找到最后一个 Epic 并展开
    const epicItems = tree.locator(
      '[role="treeitem"][aria-expanded]',
    );
    const lastEpic = epicItems.last();
    const isExpanded =
      (await lastEpic.getAttribute("aria-expanded")) === "true";
    if (!isExpanded) {
      await lastEpic.locator("button").first().click();
      await page.waitForTimeout(300);
    }

    // 查找锁定 Story（aria-disabled="true"）
    const lockedStories = lastEpic.locator(
      '[role="treeitem"][aria-disabled="true"]',
    );
    const lockedCount = await lockedStories.count();
    expect(lockedCount).toBeGreaterThan(0);
    const lockedStory = lockedStories.first();

    // 验证锁定 Story 有禁用视觉样式（opacity-50）
    const opacity = await lockedStory.evaluate((el) => {
      return window.getComputedStyle(el).opacity;
    });
    expect(parseFloat(opacity)).toBeLessThan(1);

    // 验证锁定 Story 有 cursor-not-allowed
    const cursor = await lockedStory.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });
    expect(cursor).toBe("not-allowed");

    // 强制点击锁定 Story（验证业务逻辑层仍不会触发选中）
    await lockedStory.click({ force: true });

    // 验证锁定 Story 不会变为 aria-selected="true"
    const ariaSelected = await lockedStory.getAttribute(
      "aria-selected",
    );
    expect(ariaSelected).not.toBe("true");

  });

  test("AC4: 展开/折叠动效时长（150-300ms）", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    const tree = page.locator('[role="tree"]');
    await expect(tree).toBeVisible();

    // 获取第一个 Epic
    const epicItems = tree.locator(
      '[role="treeitem"][aria-expanded]',
    );
    const firstEpic = epicItems.first();

    // 如果已展开，先折叠
    const isExpanded =
      (await firstEpic.getAttribute("aria-expanded")) === "true";
    if (isExpanded) {
      await firstEpic.locator("button").first().click();
      await page.waitForTimeout(400);
    }

    // 验证折叠状态
    await expect(firstEpic).toHaveAttribute("aria-expanded", "false");

    // 测量展开动效时长
    const expandDuration = await page.evaluate(async () => {
      const epicButton = document.querySelector<HTMLElement>(
        '[role="treeitem"][aria-expanded="false"] button',
      );
      if (!epicButton) return Number.POSITIVE_INFINITY;

      const epic = epicButton.closest('[role="treeitem"]');
      if (!epic) return Number.POSITIVE_INFINITY;

      const storyGroup = epic.querySelector('[role="group"]');
      if (!storyGroup) return Number.POSITIVE_INFINITY;

      const startedAt = performance.now();

      return await new Promise<number>((resolve) => {
        const observer = new MutationObserver(() => {
          if (epic.getAttribute("aria-expanded") === "true") {
            // 等待过渡动画完成
            storyGroup.addEventListener(
              "transitionend",
              () => {
                resolve(performance.now() - startedAt);
              },
              { once: true },
            );
          }
        });

        observer.observe(epic, {
          attributes: true,
          attributeFilter: ["aria-expanded"],
        });

        epicButton.click();

        // 安全超时
        window.setTimeout(() => {
          observer.disconnect();
          resolve(performance.now() - startedAt);
        }, 500);
      });
    });

    // 验证动效时长在 150-300ms
    expect(expandDuration).toBeGreaterThanOrEqual(150);
    expect(expandDuration).toBeLessThanOrEqual(300);

    // 验证展开后 Epic 状态正确
    await expect(firstEpic).toHaveAttribute("aria-expanded", "true");
  });

  test("A11y: 键盘导航路径与 aria 属性", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    const tree = page.locator('[role="tree"]');
    await expect(tree).toBeVisible();

    // 验证 tree 有 aria-label
    const treeAriaLabel = await tree.getAttribute("aria-label");
    expect(treeAriaLabel).toBeTruthy();

    // 验证 Epic treeitem 有 aria-expanded
    const epicItems = tree.locator(
      '[role="treeitem"][aria-expanded]',
    );
    const epicCount = await epicItems.count();
    expect(epicCount).toBeGreaterThan(0);

    // 展开第一个 Epic
    const firstEpic = epicItems.first();
    const isExpanded =
      (await firstEpic.getAttribute("aria-expanded")) === "true";
    if (!isExpanded) {
      await firstEpic.locator("button").first().click();
      await page.waitForTimeout(300);
    }

    // 验证 Story treeitem 有 aria-selected
    const storyItems = tree.locator(
      '[role="treeitem"][aria-selected][data-story-id]',
    );
    const storyCount = await storyItems.count();
    expect(storyCount).toBeGreaterThan(0);

    for (let i = 0; i < storyCount; i++) {
      const story = storyItems.nth(i);
      const ariaSelected = await story.getAttribute("aria-selected");
      expect(["true", "false"]).toContain(ariaSelected);
    }

    // 验证禁用 Story 有 aria-disabled="true"
    const disabledStories = tree.locator(
      '[role="treeitem"][aria-disabled="true"]',
    );
    const disabledCount = await disabledStories.count();
    // 禁用 Story 数量取决于数据，至少验证属性格式正确
    for (let i = 0; i < disabledCount; i++) {
      const story = disabledStories.nth(i);
      const ariaDisabled = await story.getAttribute("aria-disabled");
      expect(ariaDisabled).toBe("true");
    }

    // 验证键盘导航 - 聚焦 Epic 按钮
    const epicButton = firstEpic.locator("button").first();
    await epicButton.focus();

    // 验证焦点在 Epic 按钮上
    const focusedEpicId = await page.evaluate(
      () => document.activeElement?.getAttribute("data-epic-id"),
    );
    expect(focusedEpicId).toBeTruthy();

    // ArrowDown 应移动到下一个节点
    await page.keyboard.press("ArrowDown");
    const nextFocusedTreeItem = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      const treeItem =
        active?.getAttribute("role") === "treeitem"
          ? active
          : active?.closest<HTMLElement>('[role="treeitem"]') ?? null;
      if (!treeItem) return null;

      return {
        epicId: treeItem.getAttribute("data-epic-id"),
        storyId: treeItem.getAttribute("data-story-id"),
      };
    });
    expect(nextFocusedTreeItem).toBeTruthy();
    expect(
      Boolean(nextFocusedTreeItem?.epicId) ||
      Boolean(nextFocusedTreeItem?.storyId),
    ).toBe(true);

    const nextFocusedEpicId = await page.evaluate(
      () => document.activeElement?.getAttribute("data-epic-id"),
    );
    expect(nextFocusedEpicId).not.toBe(focusedEpicId);

    // 验证 focus-visible 可见
    await epicButton.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");

    const boxShadow = await epicButton.evaluate((el) => {
      return window.getComputedStyle(el).boxShadow;
    });
    const outline = await epicButton.evaluate((el) => {
      return window.getComputedStyle(el).outlineStyle;
    });
    const hasFocusIndicator =
      outline !== "none" || boxShadow !== "none";
    expect(hasFocusIndicator).toBe(true);
  });

  test("A11y+: 禁用项读屏可感知状态", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    const tree = page.locator('[role="tree"]');
    await expect(tree).toBeVisible();

    // 展开包含锁定 Story 的 Epic
    const epicItems = tree.locator(
      '[role="treeitem"][aria-expanded]',
    );
    const lastEpic = epicItems.last();
    const isExpanded =
      (await lastEpic.getAttribute("aria-expanded")) === "true";
    if (!isExpanded) {
      await lastEpic.locator("button").first().click();
      await page.waitForTimeout(300);
    }

    // 验证锁定 Story 有 aria-disabled
    const lockedStories = tree.locator(
      '[role="treeitem"][aria-disabled="true"]',
    );
    const lockedCount = await lockedStories.count();

    for (let i = 0; i < lockedCount; i++) {
      const story = lockedStories.nth(i);

      // 验证有状态标签文本
      const storyText = await story.textContent();
      expect(storyText).toBeTruthy();

      // 验证图标有 aria-hidden（装饰性图标，文本已提供状态信息）
      const svg = story.locator("svg");
      if (await svg.isVisible()) {
        const ariaHidden = await svg.getAttribute("aria-hidden");
        expect(ariaHidden).toBe("true");
      }
    }
  });

  test("AC2+: 刷新恢复选中 Story 与导航树展开态", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    const tree = page.locator('[role="tree"]');
    await expect(tree).toBeVisible();

    // 展开 Epic 并选中一个 Story
    const epicItems = tree.locator(
      '[role="treeitem"][aria-expanded]',
    );
    const firstEpic = epicItems.first();

    const isExpanded =
      (await firstEpic.getAttribute("aria-expanded")) === "true";
    if (!isExpanded) {
      await firstEpic.locator("button").first().click();
      await page.waitForTimeout(300);
    }

    // 选中第一个可选 Story
    const selectableStory = firstEpic.locator(
      '[role="treeitem"][data-story-id]:not([aria-disabled="true"])',
    );
    const selectableCount = await selectableStory.count();
    expect(selectableCount).toBeGreaterThan(0);
    await selectableStory.first().click();
    await page.waitForTimeout(200);

    // 记录选中的 Story ID
    const selectedStoryId = await selectableStory
      .first()
      .getAttribute("data-story-id");
    expect(selectedStoryId).toBeTruthy();

    // 刷新页面
    await page.reload();
    await page
      .waitForLoadState("networkidle", { timeout: 15_000 })
      .catch(() => {});

    // 验证导航树恢复
    const treeAfterReload = page.locator('[role="tree"]');
    await expect(treeAfterReload).toBeVisible();

    // 验证展开态恢复
    const firstEpicAfterReload = treeAfterReload
      .locator('[role="treeitem"][aria-expanded]')
      .first();
    await expect(firstEpicAfterReload).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    // 验证选中态恢复
    const selectedItem = treeAfterReload.locator(
      `[data-story-id="${selectedStoryId}"]`,
    );
    await expect(selectedItem).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // 验证中间区域上下文恢复
    const centerContext = page.getByTestId(
      "selected-story-context",
    );
    await expect(centerContext).toBeVisible({ timeout: 2_000 });
  });

  test("AC1+: 1280px 桌面断点下导航树正常渲染", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await navigateToWorkspace(page, workspaceName);

    const tree = page.locator('[role="tree"]');
    await expect(tree).toBeVisible();

    // 验证 Epic 节点可见
    const epicItems = tree.locator(
      '[role="treeitem"][aria-expanded]',
    );
    const epicCount = await epicItems.count();
    expect(epicCount).toBeGreaterThan(0);

    // 验证导航树在左侧面板内
    const treeBox = await tree.boundingBox();
    expect(treeBox).not.toBeNull();
    expect(treeBox!.width).toBeGreaterThan(100);
    expect(treeBox!.width).toBeLessThan(350);
  });
});
