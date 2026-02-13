import "./globals.css";

/**
 * 纯壳根布局
 *
 * 仅负责加载全局样式，实际的 <html>/<body> 标签由 [locale]/layout.tsx 处理。
 * 这是 next-intl App Router 的标准结构要求。
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
