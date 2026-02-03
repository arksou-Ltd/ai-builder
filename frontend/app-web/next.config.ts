import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // 避免 Turbopack 错误推断 monorepo 根目录，导致代理/解析异常
    root: __dirname,
  },
};

export default nextConfig;
