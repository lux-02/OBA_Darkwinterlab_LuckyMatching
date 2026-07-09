import type { MetadataRoute } from "next";

// 이 배포는 해커톤(2026-05) 시점 스냅샷 데모다. 현재 서비스는 luckymatching.app.
// layout.tsx 에서 noindex 를 선언하므로:
//  - 크롤링은 계속 허용해야 한다. Disallow 로 막으면 크롤러가 페이지를 못 읽어
//    noindex 태그를 보지 못하고, 오히려 색인에 그대로 남는다.
//  - sitemap 은 두지 않는다. noindex 페이지를 sitemap 으로 제출하는 건 모순 신호다.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
  };
}
