import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  turbopack: {
    // 避免 Turbopack 错误推断 monorepo 根目录，导致代理/解析异常
    root: __dirname,
  },
};

export default withNextIntl(nextConfig);
