/**
 * 工作空间 API 函数
 *
 * 封装工作空间相关的后端 API 调用。
 */

import { apiRequest } from "@/lib/api-client";

/** 工作空间响应类型（与后端 WorkspaceResponse CamelCase 对齐） */
export interface WorkspaceResponse {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建工作空间
 */
export async function createWorkspace(
  name: string,
  getToken: () => Promise<string | null>,
): Promise<WorkspaceResponse> {
  return apiRequest<WorkspaceResponse>(
    "/api/v1/workspaces",
    {
      method: "POST",
      body: JSON.stringify({ name }),
    },
    getToken,
  );
}

/**
 * 获取当前用户的工作空间列表
 */
export async function listWorkspaces(
  getToken: () => Promise<string | null>,
): Promise<WorkspaceResponse[]> {
  return apiRequest<WorkspaceResponse[]>(
    "/api/v1/workspaces",
    { method: "GET" },
    getToken,
  );
}
