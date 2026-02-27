"use client";

/**
 * API 客户端工具（Client-side 专用）
 *
 * - 请求拦截器：自动从 Clerk 获取 JWT 并注入 Authorization: Bearer <token>
 * - 响应拦截器：解析 Result[T] 统一结构，提取 data 或抛出业务错误
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
const REQUEST_TIMEOUT_MS = 10_000;

/** 后端 Result[T] 统一响应结构 */
export interface ApiResult<T> {
  code: { value: number; desc: string };
  data: T | null;
  message: string;
  requestId: string;
  timestamp: number;
}

/** API 业务错误 */
export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public requestId: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** 是否为冲突错误（409） */
  get isConflict(): boolean {
    return this.code === 4090000;
  }

  /** 是否为参数校验错误（422） */
  get isInvalidParams(): boolean {
    return this.code === 4220001;
  }

  /** 是否为未授权错误（401） */
  get isUnauthorized(): boolean {
    return this.code === 4010000;
  }
}

/**
 * 发起 API 请求
 *
 * @param path - API 路径（相对于 /api/v1）
 * @param options - fetch 选项
 * @param getToken - Clerk token 获取函数
 * @returns 解析后的 data 字段
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  getToken?: () => Promise<string | null>,
): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error("Network offline");
  }

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  // 自动注入 Clerk JWT
  if (getToken) {
    const token = await getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const url = `${API_BASE_URL}${path}`;
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort();
  }, REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal ?? timeoutController.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Network request timeout");
    }
    throw new Error("Network request failed");
  } finally {
    clearTimeout(timeoutId);
  }

  // 解析 Result[T] 结构
  const result: ApiResult<T> = await response.json();

  // 判断业务是否成功（code.value === 2000000 为 SUCCESS）
  if (result.code.value !== 2000000) {
    throw new ApiError(result.code.value, result.message, result.requestId);
  }

  return result.data as T;
}
