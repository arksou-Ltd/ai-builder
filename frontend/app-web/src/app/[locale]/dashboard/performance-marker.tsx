"use client";

import { useEffect, useRef } from "react";

/**
 * 首屏渲染性能标记组件
 *
 * 渲染为 null（零 DOM 开销），在 useEffect 中执行 performance.mark，
 * 供 AC "5 秒内进入系统并显示用户头像和用户名" 提供可复核的性能证据。
 *
 * 度量特性：
 * - useEffect 在 hydration 完成后触发，比 SSR 首次绘制更晚（偏保守/悲观度量）
 * - 如果此标记 < 5s，实际可见时间一定 < 5s（不会出现假阳性）
 * - 标记前校验 layout header 中用户名节点已渲染，确保度量覆盖"用户信息可见"
 *
 * useRef 防止 React 19 StrictMode 双重标记。
 */
export function PerformanceMarker() {
  const marked = useRef(false);

  useEffect(() => {
    if (marked.current) return;
    marked.current = true;

    // 校验 layout header 中用户信息已渲染到 DOM（SSR 输出，hydration 前即可见）
    const userDisplayName = document
      .querySelector('[data-testid="user-display-name"]')
      ?.textContent?.trim();

    const avatarContainer = document.querySelector('[data-testid="user-avatar"]');
    const avatarButton = avatarContainer?.querySelector("button,[role='button']");

    if (!userDisplayName) {
      console.warn("[性能] Dashboard 首屏标记跳过：header 用户名节点未检测到");
      return;
    }

    if (!avatarButton) {
      console.warn("[性能] Dashboard 首屏标记跳过：header 头像按钮未检测到");
      return;
    }

    performance.mark("dashboard-visible");

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[性能] Dashboard 首屏渲染时间戳: ${Math.round(performance.now())}ms（含头像/用户名可见）`
      );
    }
  }, []);

  return null;
}
