import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lucky Matching · 오늘의 나와 맞는 곳",
  description: "생년월일로 보는 나의 오행 · 욕망별 맞춤 여행지/관광상품 추천 + 일간 사주예보",
  icons: {
    icon: [{ url: "/favicon-v2.svg", type: "image/svg+xml" }],
    shortcut: "/favicon-v2.svg",
    apple: "/favicon-v2.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
