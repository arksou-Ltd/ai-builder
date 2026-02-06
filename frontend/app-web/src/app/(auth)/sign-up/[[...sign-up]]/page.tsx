import { SignUp } from "@clerk/nextjs";

/**
 * 注册页面
 *
 * 使用 Clerk 官方 App Router 路由约定：/sign-up/[[...sign-up]]
 * 避免 Clerk UI 内跳转 404
 */
export default function SignUpPage() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div aria-live="polite">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
