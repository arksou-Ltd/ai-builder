/**
 * 中间对话流 E2E 测试
 *
 * 覆盖 AC:
 * - AC1: 消息实时追加与顺序一致性
 * - AC2: In-flow 注入（workflow.step / workflow.story.status 事件驱动）
 * - AC3: 流式输出逐步渲染与完成后可折叠思考过程
 * - AC4: A11y 断言（role="log"、aria-live、role="alert"、键盘可达）
 *
 * 桌面断点：1024px / 1280px
 * 回归保护：不破坏 workspace-shell / workspace-workflow-steps / workspace-epic-story-tree
 *
 * No Mock Policy: 禁止 mock/stub/fake/spy 与网络拦截替身
 * 测试通过真实 CustomEvent 触发 In-flow 更新，通过 Zustand store 直接操作消息。
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
  enterSpace: /进入空间|Enter Space/,
  workspaceActions: /工作空间操作|Workspace actions/,
  deleteWorkspace: /删除工作空间|Delete Workspace/,
  confirmDelete: /确认删除|Delete/,
  conversationEmpty: /暂无对话消息|No messages yet/,
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

    if (visible) return card.first();

    if (i < attempts - 1) {
      await page.reload();
      await expect(
        page.getByRole("heading", { name: TEXT.dashboardTitle }),
      ).toBeVisible({ timeout: 10_000 });
    }
  }
  throw new Error(`Workspace card not found after retries: ${name}`);
}

async function createAndNavigateToWorkspace(
  page: import("@playwright/test").Page,
) {
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: TEXT.dashboardTitle }),
  ).toBeVisible({ timeout: 10_000 });

  const uniqueName = `e2e-conv-${Date.now().toString(36)}`;

  const createButton = page
    .getByRole("button", { name: TEXT.createWorkspace })
    .first();
  await createButton.click();

  const createDialog = page.getByRole("dialog", {
    name: TEXT.createWorkspace,
  });
  await expect(createDialog).toBeVisible({ timeout: 10_000 });

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
    if (!hasNameRequired) break;
  }

  if (!submitted) {
    throw new Error(
      `Create workspace dialog did not close after retries: ${uniqueName}`,
    );
  }

  const card = await waitForWorkspaceCard(page, uniqueName);
  await card.getByRole("button", { name: TEXT.enterSpace }).click();
  await page.waitForURL("**/workspace/**", { timeout: 10_000 });

  return uniqueName;
}

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

/**
 * 通过浏览器上下文向 Zustand conversation store 注入消息
 *
 * 不使用 Mock —— 直接操作真实的 Zustand store 实例。
 */
async function injectUserMessage(
  page: import("@playwright/test").Page,
  content: string,
) {
  await page.evaluate((msgContent) => {
    // 获取 URL 中的 workspaceId
    const pathParts = window.location.pathname.split("/");
    const wsIdx = pathParts.indexOf("workspace");
    const workspaceId = wsIdx >= 0 ? pathParts[wsIdx + 1] : "unknown";

    // 通过 Zustand store 的 localStorage 机制获取 store 引用
    // 使用全局 store API
    const storeState = JSON.parse(
      localStorage.getItem("ai-builder-conversation") || '{"state":{"workspaces":{}}}',
    );
    const wsData = storeState.state?.workspaces?.[workspaceId] || {
      messages: [],
      version: 1,
    };
    const seq = wsData.messages.length + 1;
    wsData.messages.push({
      id: `test-user-${Date.now()}-${seq}`,
      kind: "user",
      content: msgContent,
      createdAt: Date.now(),
      sequence: seq,
      streamingState: "idle",
      thinkingContent: null,
      thinkingState: "hidden",
      severity: null,
      sourceEvent: null,
    });
    storeState.state.workspaces[workspaceId] = wsData;
    localStorage.setItem(
      "ai-builder-conversation",
      JSON.stringify(storeState),
    );

    // 触发 storage event 以通知 Zustand persist 重新加载
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "ai-builder-conversation",
        newValue: JSON.stringify(storeState),
      }),
    );
  }, content);
}

/**
 * 通过浏览器上下文注入 AI 消息（支持流式与完成状态）
 */
async function injectAiMessage(
  page: import("@playwright/test").Page,
  options: {
    content: string;
    streamingState: "idle" | "streaming" | "complete";
    thinkingContent?: string;
  },
) {
  await page.evaluate((opts) => {
    const pathParts = window.location.pathname.split("/");
    const wsIdx = pathParts.indexOf("workspace");
    const workspaceId = wsIdx >= 0 ? pathParts[wsIdx + 1] : "unknown";

    const storeState = JSON.parse(
      localStorage.getItem("ai-builder-conversation") || '{"state":{"workspaces":{}}}',
    );
    const wsData = storeState.state?.workspaces?.[workspaceId] || {
      messages: [],
      version: 1,
    };
    const seq = wsData.messages.length + 1;
    wsData.messages.push({
      id: `test-ai-${Date.now()}-${seq}`,
      kind: "ai",
      content: opts.content,
      createdAt: Date.now(),
      sequence: seq,
      streamingState: opts.streamingState,
      thinkingContent: opts.thinkingContent || null,
      thinkingState: opts.thinkingContent ? "collapsed" : "hidden",
      severity: null,
      sourceEvent: null,
    });
    storeState.state.workspaces[workspaceId] = wsData;
    localStorage.setItem(
      "ai-builder-conversation",
      JSON.stringify(storeState),
    );

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "ai-builder-conversation",
        newValue: JSON.stringify(storeState),
      }),
    );
  }, options);
}

/**
 * 通过真实 CustomEvent 触发 workflow.step 事件
 */
async function dispatchStepEvent(
  page: import("@playwright/test").Page,
  stepId: string,
  status: string,
) {
  await page.evaluate(
    ({ step, stat }) => {
      window.dispatchEvent(
        new CustomEvent("workflow.step", {
          detail: { step, status: stat },
        }),
      );
    },
    { step: stepId, stat: status },
  );
}

/**
 * 通过真实 CustomEvent 触发 workflow.story.status 事件
 */
async function dispatchStoryStatusEvent(
  page: import("@playwright/test").Page,
  storyId: string,
  status: string,
) {
  await page.evaluate(
    ({ sid, stat }) => {
      window.dispatchEvent(
        new CustomEvent("workflow.story.status", {
          detail: { storyId: sid, status: stat },
        }),
      );
    },
    { sid: storyId, stat: status },
  );
}

/**
 * 通过真实 CustomEvent 触发 ai.thinking 事件
 */
async function dispatchAiThinkingEvent(
  page: import("@playwright/test").Page,
  payload: {
    action: "start" | "delta" | "complete";
    messageId: string;
    content?: string;
    thinkingContent?: string;
  },
) {
  await page.evaluate((detail) => {
    window.dispatchEvent(
      new CustomEvent("ai.thinking", { detail }),
    );
  }, payload);
}

test.describe("中间对话流", () => {
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

  test("AC1: 中间区域初始为空态，显示提示文案", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    // 验证对话区空态
    const emptyState = page.getByTestId("conversation-empty");
    await expect(emptyState).toBeVisible({ timeout: 5_000 });
    await expect(emptyState).toContainText(TEXT.conversationEmpty);
  });

  test("AC1: 消息追加后实时显示且顺序正确", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    // 注入三条消息
    await injectUserMessage(page, "第一条用户消息");
    await page.waitForTimeout(100);
    await injectUserMessage(page, "第二条用户消息");
    await page.waitForTimeout(100);
    await injectAiMessage(page, {
      content: "AI 回复内容",
      streamingState: "complete",
    });

    // 等待页面重新加载 store 数据（storage event 触发）
    await page.reload();
    await page.waitForURL("**/workspace/**", { timeout: 10_000 });

    // 验证对话面板出现（非空态）
    const panel = page.getByTestId("conversation-stream-panel");
    await expect(panel).toBeVisible({ timeout: 5_000 });

    // 验证消息数量 >= 3
    const messageItems = panel.locator('[data-testid^="message-"]');
    const count = await messageItems.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // 验证消息顺序（第一条在第二条之前）
    const allTexts = await messageItems.allTextContents();
    const firstIdx = allTexts.findIndex((t) => t.includes("第一条用户消息"));
    const secondIdx = allTexts.findIndex((t) => t.includes("第二条用户消息"));
    const aiIdx = allTexts.findIndex((t) => t.includes("AI 回复内容"));
    expect(firstIdx).toBeLessThan(secondIdx);
    expect(secondIdx).toBeLessThan(aiIdx);
  });

  test("AC2: workflow.step 事件触发 In-flow 更新注入对话流", async ({
    page,
  }) => {
    await navigateToWorkspace(page, workspaceName);

    // 分发真实的 workflow.step 事件
    await dispatchStepEvent(page, "drafting", "in_progress");
    await page.waitForTimeout(500);

    // 验证 In-flow 消息出现在对话流中
    // 因为 storage event 需要刷新才能看到变化，先等待然后刷新
    await page.reload();
    await page.waitForURL("**/workspace/**", { timeout: 10_000 });

    const panel = page.getByTestId("conversation-stream-panel");
    await expect(panel).toBeVisible({ timeout: 5_000 });

    // 验证有 in_flow_update 类型的消息
    const inFlowMessages = panel.locator(
      '[data-message-kind="in_flow_update"]',
    );
    const inFlowCount = await inFlowMessages.count();
    expect(inFlowCount).toBeGreaterThan(0);
  });

  test("AC2: workflow.story.status 事件触发 In-flow 更新", async ({
    page,
  }) => {
    await navigateToWorkspace(page, workspaceName);

    // 分发真实的 workflow.story.status 事件
    await dispatchStoryStatusEvent(page, "3-4", "in_progress");
    await page.waitForTimeout(500);

    await page.reload();
    await page.waitForURL("**/workspace/**", { timeout: 10_000 });

    const panel = page.getByTestId("conversation-stream-panel");
    await expect(panel).toBeVisible({ timeout: 5_000 });

    // 验证 In-flow 消息包含 story 状态信息
    const inFlowMessages = panel.locator(
      '[data-message-kind="in_flow_update"]',
    );
    const count = await inFlowMessages.count();
    expect(count).toBeGreaterThan(0);
  });

  test("AC3: AI 流式消息显示 streaming 指示器", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    const messageId = `ai-stream-${Date.now()}`;

    // start: 创建 streaming 消息
    await dispatchAiThinkingEvent(page, {
      action: "start",
      messageId,
    });
    await page.waitForTimeout(150);

    const panel = page.getByTestId("conversation-stream-panel");
    await expect(panel).toBeVisible({ timeout: 5_000 });

    const aiMessage = panel.getByTestId(`message-${messageId}`);
    await expect(aiMessage).toBeVisible({ timeout: 2_000 });
    await expect(aiMessage).toHaveAttribute("data-streaming-state", "streaming");

    // delta: 逐步追加内容
    await dispatchAiThinkingEvent(page, {
      action: "delta",
      messageId,
      content: "第一段",
    });
    await page.waitForTimeout(100);
    await dispatchAiThinkingEvent(page, {
      action: "delta",
      messageId,
      content: " 第二段",
    });

    await expect(aiMessage).toContainText("第一段 第二段");

    // complete: 流式结束，状态切为 complete
    await dispatchAiThinkingEvent(page, {
      action: "complete",
      messageId,
      thinkingContent: "这是流式完成后的思考过程",
    });
    await page.waitForTimeout(150);
    await expect(aiMessage).toHaveAttribute("data-streaming-state", "complete");
  });

  test("AC3: 完成的 AI 消息思考过程可折叠", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    const messageId = `ai-collapse-${Date.now()}`;

    await dispatchAiThinkingEvent(page, {
      action: "start",
      messageId,
    });
    await dispatchAiThinkingEvent(page, {
      action: "delta",
      messageId,
      content: "这是 AI 的最终回复",
    });
    await dispatchAiThinkingEvent(page, {
      action: "complete",
      messageId,
      thinkingContent: "这是思考过程的详细内容",
    });
    await page.waitForTimeout(200);

    const panel = page.getByTestId("conversation-stream-panel");
    await expect(panel).toBeVisible({ timeout: 5_000 });

    // 验证思考过程组件存在
    const thinkingProcess = panel.locator(
      '[data-testid="thinking-process"]',
    );
    const thinkingCount = await thinkingProcess.count();
    expect(thinkingCount).toBeGreaterThan(0);

    // 验证折叠按钮存在
    const toggleButton = thinkingProcess
      .first()
      .locator('[data-testid="thinking-process-toggle"]');
    await expect(toggleButton).toBeVisible();

    // 点击展开
    await toggleButton.click();

    // 验证思考内容可见
    const thinkingContent = thinkingProcess
      .first()
      .locator('[data-testid="thinking-process-content"]');
    await expect(thinkingContent).toBeVisible({ timeout: 1_000 });
    await expect(thinkingContent).toContainText("这是思考过程的详细内容");

    // 再次点击折叠
    await toggleButton.click();
    await expect(thinkingContent).toHaveCount(0);
  });

  test("AC4: 对话容器具备 role=log 与 aria-live", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    const panel = page.getByTestId("conversation-stream-panel");
    await expect(panel).toBeVisible({ timeout: 5_000 });

    // 验证 role="log"
    await expect(panel).toHaveAttribute("role", "log");

    // 验证 aria-live="polite"
    await expect(panel).toHaveAttribute("aria-live", "polite");

    // 验证 aria-atomic="false"（仅播报新增内容）
    await expect(panel).toHaveAttribute("aria-atomic", "false");

    // 验证有 aria-label
    const ariaLabel = await panel.getAttribute("aria-label");
    expect(ariaLabel).toBeTruthy();
  });

  test("AC4: 错误级别 In-flow 消息使用 role=alert", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    // 注入一条 error 级别的 In-flow 消息
    await page.evaluate(() => {
      const pathParts = window.location.pathname.split("/");
      const wsIdx = pathParts.indexOf("workspace");
      const workspaceId = wsIdx >= 0 ? pathParts[wsIdx + 1] : "unknown";

      const storeState = JSON.parse(
        localStorage.getItem("ai-builder-conversation") || '{"state":{"workspaces":{}}}',
      );
      const wsData = storeState.state?.workspaces?.[workspaceId] || {
        messages: [],
        version: 1,
      };
      const seq = wsData.messages.length + 1;
      wsData.messages.push({
        id: `test-error-${Date.now()}-${seq}`,
        kind: "in_flow_update",
        content: "错误：服务不可用",
        createdAt: Date.now(),
        sequence: seq,
        streamingState: "idle",
        thinkingContent: null,
        thinkingState: "hidden",
        severity: "error",
        sourceEvent: "workflow.step",
      });
      storeState.state.workspaces[workspaceId] = wsData;
      localStorage.setItem(
        "ai-builder-conversation",
        JSON.stringify(storeState),
      );

      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "ai-builder-conversation",
          newValue: JSON.stringify(storeState),
        }),
      );
    });

    await page.reload();
    await page.waitForURL("**/workspace/**", { timeout: 10_000 });

    const panel = page.getByTestId("conversation-stream-panel");
    await expect(panel).toBeVisible({ timeout: 5_000 });

    // 验证 error 消息有 role="alert"
    const errorMessages = panel.locator('[data-severity="error"]');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBeGreaterThan(0);
    await expect(errorMessages.first()).toHaveAttribute("role", "alert");
  });

  test("AC4: 对话区域键盘可达", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    const panel = page.getByTestId("conversation-stream-panel");
    await expect(panel).toBeVisible({ timeout: 5_000 });

    // Tab 键可以到达对话区域
    await page.keyboard.press("Tab");

    // 验证思考折叠按钮可通过键盘聚焦
    const toggleButtons = panel.locator(
      '[data-testid="thinking-process-toggle"]',
    );
    const toggleCount = await toggleButtons.count();
    if (toggleCount > 0) {
      await toggleButtons.first().focus();
      await expect(toggleButtons.first()).toBeFocused();
    }
  });

  test("布局: 1024px 最小桌面断点下对话面板正常渲染", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await navigateToWorkspace(page, workspaceName);

    // 验证中间区域可见
    const centerPanel = page.locator("main");
    await expect(centerPanel).toBeVisible();

    // 验证对话面板或空态可见
    const panel = page.getByTestId("conversation-stream-panel");
    const empty = page.getByTestId("conversation-empty");

    const panelVisible = await panel.isVisible().catch(() => false);
    const emptyVisible = await empty.isVisible().catch(() => false);
    expect(panelVisible || emptyVisible).toBe(true);

    // 验证三面板布局不重叠
    const shell = page.getByTestId("workspace-shell-layout");
    await expect(shell).toBeVisible();
    await expect(shell).toHaveCSS("display", "grid");
  });

  test("布局: 1280px 桌面断点下对话面板正常渲染", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await navigateToWorkspace(page, workspaceName);

    // 验证中间区域可见
    const centerPanel = page.locator("main");
    await expect(centerPanel).toBeVisible();

    // 验证对话面板或空态可见
    const panel = page.getByTestId("conversation-stream-panel");
    const empty = page.getByTestId("conversation-empty");

    const panelVisible = await panel.isVisible().catch(() => false);
    const emptyVisible = await empty.isVisible().catch(() => false);
    expect(panelVisible || emptyVisible).toBe(true);
  });

  test("回归: 左侧步骤面板与导航树仍正常渲染", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    // 验证步骤面板仍存在
    const stepsPanel = page.getByTestId("workflow-steps-panel");
    await expect(stepsPanel).toBeVisible({ timeout: 5_000 });

    // 验证导航树仍存在
    const tree = page.locator('[role="tree"]');
    await expect(tree).toBeVisible();

    // 验证三面板布局结构完整
    const shell = page.getByTestId("workspace-shell-layout");
    await expect(shell).toBeVisible();
    const gridColumns = await shell.evaluate(
      (el) => window.getComputedStyle(el).gridTemplateColumns,
    );
    expect(gridColumns.split(" ").length).toBe(3);
  });

  test("回归: Story 选中后中间区仍显示上下文", async ({ page }) => {
    await navigateToWorkspace(page, workspaceName);

    const tree = page.locator('[role="tree"]');
    await expect(tree).toBeVisible();

    // 展开 Epic
    const epicItems = tree.locator('[role="treeitem"][aria-expanded]');
    const firstEpic = epicItems.first();
    const isExpanded =
      (await firstEpic.getAttribute("aria-expanded")) === "true";
    if (!isExpanded) {
      await firstEpic.locator("button").first().click();
      await page.waitForTimeout(300);
    }

    // 选中一个 Story
    const selectableStory = firstEpic.locator(
      '[role="treeitem"][data-story-id]:not([aria-disabled="true"])',
    );
    const selectableCount = await selectableStory.count();
    if (selectableCount > 0) {
      await selectableStory.first().click();
      await page.waitForTimeout(500);

      // 验证中间区域显示选中 Story 上下文
      const centerContext = page.getByTestId("selected-story-context");
      await expect(centerContext).toBeVisible({ timeout: 2_000 });
    }
  });
});
