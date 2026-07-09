import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import StructuredData from "./structured-data";
import {
  SITE_URL,
  SITE_NAME,
  SITE_NAME_FULL,
  SITE_DESCRIPTION,
  SITE_OG_DESCRIPTION,
  SITE_KEYWORDS,
} from "./site-config";

// 검색엔진 소유확인 토큰은 env로 주입(없으면 메타 미출력).
// Vercel 프로젝트 환경변수에 GOOGLE_SITE_VERIFICATION / NAVER_SITE_VERIFICATION 추가 후 재배포.
const verification: NonNullable<Metadata["verification"]> = {};
const googleToken = process.env.GOOGLE_SITE_VERIFICATION;
const naverToken = process.env.NAVER_SITE_VERIFICATION;
if (googleToken) verification.google = googleToken;
if (naverToken) verification.other = { "naver-site-verification": naverToken };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "럭키매칭 (Lucky Matching) · 사주 오행으로 떠나는 국내 여행 추천",
    template: "%s · 럭키매칭 Lucky Matching",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  authors: [{ name: "Darkwinterlab" }],
  creator: "Darkwinterlab",
  publisher: SITE_NAME,
  category: "travel",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME_FULL,
    title: "럭키매칭 · 사주 오행으로 떠나는, 오늘 나와 맞는 여행",
    description: SITE_OG_DESCRIPTION,
    // og:image / twitter:image 는 app/opengraph-image.tsx 파일 컨벤션이 자동 주입
  },
  twitter: {
    card: "summary_large_image",
    title: "럭키매칭 · 사주 오행으로 떠나는 여행",
    description: SITE_OG_DESCRIPTION,
  },
  // 해커톤(2026-05) 시점 스냅샷 데모. 현재 서비스는 luckymatching.app 이다.
  // 색인되면 "럭키매칭" 브랜드 검색에서 구버전이 노출돼 사용자가 잘못 착지한다.
  // 데모 자체는 살려두되 색인만 뺀다. follow 는 유지해 본문의 .app 링크를 넘긴다.
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
  ...(Object.keys(verification).length ? { verification } : {}),
  icons: {
    icon: [{ url: "/favicon-v2.svg", type: "image/svg+xml" }],
    shortcut: "/favicon-v2.svg",
    apple: "/favicon-v2.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {children}
        <StructuredData />
        <Analytics />
      </body>
    </html>
  );
}
