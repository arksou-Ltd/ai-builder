declare module "@playwright/test" {
  export interface Request {
    method(): string;
    url(): string;
  }

  export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  export interface Locator {
    first(): Locator;
    nth(index: number): Locator;
    count(): Promise<number>;
    locator(selector: string, options?: Record<string, unknown>): Locator;
    getByRole(role: string, options?: Record<string, unknown>): Locator;
    getByText(text: string | RegExp): Locator;
    click(): Promise<void>;
    fill(value: string): Promise<void>;
    focus(): Promise<void>;
    isVisible(): Promise<boolean>;
    boundingBox(): Promise<BoundingBox | null>;
    getAttribute(name: string): Promise<string | null>;
    evaluate<T>(fn: (element: Element) => T): Promise<T>;
  }

  export interface Keyboard {
    press(key: string): Promise<void>;
  }

  export interface Page {
    goto(url: string): Promise<void>;
    waitForURL(url: string, options?: Record<string, unknown>): Promise<void>;
    waitForLoadState(state: string, options?: Record<string, unknown>): Promise<void>;
    setViewportSize(size: { width: number; height: number }): Promise<void>;
    getByRole(role: string, options?: Record<string, unknown>): Locator;
    getByText(text: string | RegExp): Locator;
    getByPlaceholder(text: string | RegExp): Locator;
    getByTestId(testId: string): Locator;
    locator(selector: string, options?: Record<string, unknown>): Locator;
    on(event: string, listener: (request: Request) => void): void;
    off(event: string, listener: (request: Request) => void): void;
    context(): BrowserContext;
    keyboard: Keyboard;
    evaluate<R, A = void>(fn: (arg: A) => R, arg?: A): Promise<R>;
    reload(): Promise<void>;
  }

  export interface BrowserContext {
    newPage(): Promise<Page>;
    close(): Promise<void>;
    setOffline(offline: boolean): Promise<void>;
    storageState(options?: { path?: string }): Promise<void>;
    waitForEvent(event: string): Promise<Page>;
  }

  export interface Browser {
    newContext(options?: Record<string, unknown>): Promise<BrowserContext>;
  }

  export interface TestFixtures {
    page: Page;
    browser: Browser;
    context: BrowserContext;
  }

  export interface Describe {
    (title: string, body: () => void): void;
    configure(options: Record<string, unknown>): void;
  }

  export interface TestType {
    (title: string, body: (fixtures: TestFixtures) => Promise<void> | void): void;
    use(options: Record<string, unknown>): void;
    describe: Describe;
    beforeAll(body: (fixtures: TestFixtures) => Promise<void> | void): void;
    afterAll(body: (fixtures: TestFixtures) => Promise<void> | void): void;
    beforeEach(body: (fixtures: TestFixtures) => Promise<void> | void): void;
  }

  export const test: TestType;
  export interface ExpectMatcher {
    not: ExpectMatcher;
    toBe(value: unknown): Promise<void> | void;
    toBeNull(): Promise<void> | void;
    toBeTruthy(): Promise<void> | void;
    toBeVisible(options?: Record<string, unknown>): Promise<void> | void;
    toBeFocused(options?: Record<string, unknown>): Promise<void> | void;
    toBeEnabled(options?: Record<string, unknown>): Promise<void> | void;
    toBeAttached(options?: Record<string, unknown>): Promise<void> | void;
    toHaveClass(value: unknown): Promise<void> | void;
    toHaveURL(value: unknown): Promise<void> | void;
    toHaveCSS(property: string, value: string): Promise<void> | void;
    toHaveAttribute(name: string, value?: unknown, options?: Record<string, unknown>): Promise<void> | void;
    toHaveCount(count: number): Promise<void> | void;
    toContain(value: unknown): Promise<void> | void;
    toBeGreaterThan(value: number): Promise<void> | void;
    toBeGreaterThanOrEqual(value: number): Promise<void> | void;
    toBeLessThan(value: number): Promise<void> | void;
    toBeLessThanOrEqual(value: number): Promise<void> | void;
  }

  export interface ExpectType {
    (actual: unknown): ExpectMatcher;
    poll<T>(
      callback: () => T | Promise<T>,
      options?: Record<string, unknown>,
    ): ExpectMatcher;
  }

  export const expect: ExpectType;
  export const devices: Record<string, Record<string, unknown>>;
  export function defineConfig(config: Record<string, unknown>): Record<string, unknown>;
}
