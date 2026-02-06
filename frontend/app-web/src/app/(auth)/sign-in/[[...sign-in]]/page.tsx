import { SignIn } from "@clerk/nextjs";

/**
 * 登录页面
 *
 * 使用 Clerk 官方 App Router 路由约定：/sign-in/[[...sign-in]]
 * 支持邮箱/Google/GitHub Account 登录方式
 */
export default function SignInPage() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div aria-live="polite">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
