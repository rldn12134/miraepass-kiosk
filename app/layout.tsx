import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";
import "./globals.css";

const pretendard = localFont({
  src: [
    { path: "../public/fonts/Pretendard-Regular.woff2", weight: "400" },
    { path: "../public/fonts/Pretendard-Medium.woff2", weight: "500" },
    { path: "../public/fonts/Pretendard-SemiBold.woff2", weight: "600" },
    { path: "../public/fonts/Pretendard-Bold.woff2", weight: "700" },
    { path: "../public/fonts/Pretendard-ExtraBold.woff2", weight: "800" },
  ],
  variable: "--font-pretendard",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "미래카페", template: "%s · 미래카페" },
  description: "순천미래과학고등학교 교내 카페 · MIRAEPASS 결제",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F1F5F9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={cn(pretendard.variable)} suppressHydrationWarning>
      <body className="min-h-dvh font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
