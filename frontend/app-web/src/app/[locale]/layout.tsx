import type { Metadata } from "next";
import { Open_Sans, Poppins } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { Providers } from "./providers";

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
});

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "ai-builder",
  description: "AI Builder - 智能开发平台",
};

/**
 * Locale 感知的根布局
 *
 * 包含 <html lang={locale}> 动态化、NextIntlClientProvider、全局 Providers。
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = (await import(`../../../messages/${locale}.json`)).default;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${openSans.variable} ${poppins.variable} font-sans antialiased`} suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
