import { auth } from "@clerk/nextjs/server";

/**
 * 工作空间执行页布局
 *
 * 使用 auth.protect() 做登录保护（纵深防御第二层）。
 * 不包含 dashboard 的列表布局，独立承载三面板壳层。
 */
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  // 纵深防御第二层：组件级保护
  await auth.protect();

  return <div className="bg-background text-foreground h-screen overflow-hidden">{children}</div>;
}
