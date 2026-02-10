"use client";

import { PerformanceMarker } from "./performance-marker";
import { WorkspaceList } from "@/components/workspace/WorkspaceList";

/**
 * Dashboard 首页
 *
 * 登录成功后的默认落地页面。
 * 展示当前用户的工作空间列表（含创建入口）。
 * 保留 PerformanceMarker 组件。
 */
export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <PerformanceMarker />
      <WorkspaceList />
    </div>
  );
}
