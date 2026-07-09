// 사이트 전역 SEO/GEO 설정 — layout · sitemap · robots · 구조화데이터 · OG · FAQ가 모두 여기서 파생.
// 도메인을 바꾸면 SITE_URL env 하나만 교체하면 됨 (canonical/OG/sitemap 전부 따라감).

const rawUrl = process.env.SITE_URL ?? "https://luckymatching.n2f.site";

/** 끝 슬래시 제거된 정규 URL */
export const SITE_URL = rawUrl.replace(/\/+$/, "");

export const SITE_NAME = "럭키매칭";
export const SITE_NAME_FULL = "럭키매칭 (Lucky Matching)";
export const SITE_TAGLINE = "사주 오행으로 떠나는, 오늘 나와 맞는 여행";

/** 수익화/고도화 버전의 대표 도메인. 공개 버전(n2f.site)에서는 CTA와 임시 리다이렉트 목적지로 사용. */
export const COMMERCIAL_SITE_URL = (
  process.env.NEXT_PUBLIC_COMMERCIAL_SITE_URL ?? "https://luckymatching.app"
).replace(/\/+$/, "");

export const SITE_DESCRIPTION =
  "럭키매칭(Lucky Matching) — 생년월일로 사주 오행을 분석해 오늘 나와 맞는 국내 여행지와 관광상품을 추천하고, 매일 바뀌는 일간 사주예보까지 알려주는 무료 서비스. 요즘 뜨는 '럭키맥싱' 트렌드를 진짜 여행으로.";

export const SITE_OG_DESCRIPTION =
  "생년월일로 보는 나의 오행, 원하는 운에 맞춘 국내 여행지/관광상품 추천 + 일간 사주예보. 운세를 보는 데서 끝내지 말고 진짜 떠나자.";

/** 검색 키워드 — '럭키매칭'(브랜드) 우선, '럭키맥싱'(트렌드) 보조 */
export const SITE_KEYWORDS = [
  "럭키매칭",
  "Lucky Matching",
  "럭키맥싱",
  "사주 여행",
  "오행 여행",
  "사주 여행지 추천",
  "사주 여행 추천",
  "오늘의 운세 여행",
  "운세 여행",
  "여행지 추천",
  "사주 오행",
  "일간 사주예보",
  "개운 여행",
  "국내 여행 추천",
  "오방색 여행",
];

/** 화면에 보이는 FAQ와 JSON-LD FAQPage가 동일해야 함(구글 정책) → 단일 소스 */
export const FAQ: { q: string; a: string }[] = [
  {
    q: "럭키매칭이 뭐예요?",
    a: "럭키매칭(Lucky Matching)은 생년월일로 사주 오행을 분석해 '오늘의 나'와 잘 맞는 국내 여행지와 관광상품을 추천하고, 매일 바뀌는 일간 사주예보까지 알려주는 무료 서비스예요.",
  },
  {
    q: "럭키매칭은 무료인가요?",
    a: "네, 생년월일만 넣으면 오행 분석부터 여행지 추천, 일간 사주예보까지 모두 무료로 볼 수 있어요. 회원가입도 필요 없어요.",
  },
  {
    q: "럭키매칭은 어떻게 여행지를 골라주나요?",
    a: "사주에서 부족하거나 과한 오행(목·화·토·금·수)을 따져, 그 기운을 채워주는 지역을 오방(동·서·남·북·중앙) 이론으로 매칭해요. 원하는 운(재물·애정·건강 등)을 고르면 더 개인화된 추천을 받을 수 있어요.",
  },
  {
    q: "'럭키맥싱'이랑 무슨 관계예요?",
    a: "요즘 2030 사이에 운을 적극적으로 끌어모으는 '럭키맥싱' 트렌드가 있어요. 럭키매칭은 운세를 '보는' 데서 끝내지 않고, 실제로 그 기운의 여행지로 '떠나는' 경험까지 이어주려고 만들었어요.",
  },
];

export const SITE_AWARD =
  "2026 OBA Weekend-thon 메인 트랙 OpenAI Build Award 1위";

// 브랜드=도메인을 묶는 외부 권위 신호(엔티티 확신 ↑). Vercel env에 콤마구분 URL로 주입:
//   SITE_SAMEAS="https://instagram.com/...,https://github.com/...,https://www.linkedin.com/..."
// 운영 채널이 실제로 있을 때만 채울 것(없는 sameAs는 무의미).
export const SITE_SAMEAS = (process.env.SITE_SAMEAS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
