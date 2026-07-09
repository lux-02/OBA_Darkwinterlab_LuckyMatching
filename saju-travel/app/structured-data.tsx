// JSON-LD 구조화데이터 — 구글이 "luckymatching.n2f.site = 럭키매칭 서비스"를 하나의 엔티티로
// 인식하게 하고, AI 검색엔진(GEO)이 인용할 수 있는 사실을 제공한다.
import {
  SITE_URL,
  SITE_NAME,
  SITE_NAME_FULL,
  SITE_DESCRIPTION,
  SITE_AWARD,
  SITE_SAMEAS,
  FAQ,
} from "./site-config";

export default function StructuredData() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        alternateName: "Lucky Matching",
        url: SITE_URL,
        logo: `${SITE_URL}/favicon-v2.svg`,
        description: "사주 오행 기반 국내 여행지 추천 서비스",
        foundingDate: "2026-05",
        founder: { "@type": "Person", name: "Darkwinterlab" },
        award: SITE_AWARD,
        ...(SITE_SAMEAS.length ? { sameAs: SITE_SAMEAS } : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME_FULL,
        alternateName: ["럭키매칭", "Lucky Matching"],
        inLanguage: "ko-KR",
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#webapp`,
        name: SITE_NAME,
        alternateName: "Lucky Matching",
        url: SITE_URL,
        applicationCategory: "TravelApplication",
        operatingSystem: "Web",
        browserRequirements: "Requires JavaScript",
        inLanguage: "ko-KR",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
        publisher: { "@id": `${SITE_URL}/#organization` },
        creator: { "@id": `${SITE_URL}/#organization` },
        description: SITE_DESCRIPTION,
        featureList: [
          "사주 오행 분석",
          "원하는 운(욕망)별 맞춤 여행지 추천",
          "일간 사주예보",
          "인터랙티브 오방 지도",
          "실제 국내 여행 상품 연결",
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // JSON-LD는 신뢰되는 정적 데이터 — XSS 차단을 위해 '<' 만 이스케이프
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(graph).replace(/</g, "\\u003c"),
      }}
    />
  );
}
