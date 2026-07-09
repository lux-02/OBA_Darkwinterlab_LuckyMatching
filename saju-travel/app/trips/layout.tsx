import type { Metadata } from "next";

// /trips는 쿼리파라미터(?element=&label=&region=) 변형이 thin·중복 콘텐츠로 색인돼
// 홈 랭킹을 희석할 수 있어 noindex. 단 follow로 내부 링크 권위는 유지한다.
export const metadata: Metadata = {
  title: "맞춤 개운 여행",
  alternates: { canonical: "/trips" },
  robots: { index: false, follow: true },
};

export default function TripsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
