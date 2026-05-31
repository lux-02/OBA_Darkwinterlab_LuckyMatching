// 오행 색/방위/액티비티 + 시군구·시도 오행 조회 헬퍼.
// 시군구 정밀 매핑은 lib/municipalityElements.ts (scripts/gen-elements.mjs 로 생성).
import { MUNICIPALITY_ELEMENT, PROVINCE_ELEMENT_GEN } from "./municipalityElements";

// 시도(2자리) 대표 오행 = 소속 시군구 최빈 오행 (생성값).
export const PROVINCE_ELEMENT: Record<string, string> = PROVINCE_ELEMENT_GEN;

export const ELEMENT_COLOR: Record<string, string> = {
  목: "#2f9e6e",
  화: "#e2483d",
  토: "#d4a017",
  금: "#8895a7",
  수: "#2b6cb0",
};

export const ELEMENT_DIRECTION: Record<string, string> = {
  목: "동", 화: "남", 토: "중앙", 금: "서", 수: "북",
};

// 오행별 대표 지역(욕망 추천 + 상품 검색 키워드용). 서버 OBANG_REGIONS와 동기.
export const ELEMENT_REGIONS: Record<string, string[]> = {
  목: ["설악산·속초", "지리산 둘레길", "담양 죽녹원"],
  화: ["제주", "부산 해운대", "유성 온천"],
  토: ["안동 하회마을", "전주 한옥마을", "경주"],
  금: ["서울", "인천", "북한산"],
  수: ["강릉", "충주호", "남이섬"],
};

// 오행별 개운 액티비티(지도 L3에서 사용).
export const ELEMENT_ACTIVITIES: Record<string, string[]> = {
  목: ["트레킹", "숲치유", "캠핑", "수목원"],
  화: ["온천·스파", "해변", "축제·야경", "맛집투어"],
  토: ["전통문화", "한옥스테이", "고궁·유적", "농촌체험"],
  금: ["미술관·전시", "쇼핑", "도심야경", "암벽·클라이밍"],
  수: ["해양레저", "서핑", "호수카약", "워터파크"],
};

// 코드 → 시도 코드(2자리). 시군구(5자리)는 앞 2자리가 소속 시도.
export function provinceCodeOf(code: string): string {
  return code.slice(0, 2);
}

// 시군구 정밀 오행(없으면 소속 시도 대표로 폴백).
export function elementOf(code: string): string | undefined {
  return MUNICIPALITY_ELEMENT[code] ?? PROVINCE_ELEMENT[provinceCodeOf(code)];
}
