"use client";

import { useState } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * 全局 Provider 容器
 *
 * 包含：
 * - ClerkProvider：身份认证
 * - QueryClientProvider：TanStack Query 状态管理
 */
export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 窗口聚焦时不重新获取
            refetchOnWindowFocus: false,
            // 重试 1 次
            retry: 1,
            // 数据缓存 5 分钟
            staleTime: 5 * 60 * 1000,
          },
        },
      })
  );

  return (
    <ClerkProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ClerkProvider>
  );
}
