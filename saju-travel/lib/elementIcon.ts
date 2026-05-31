// 오행 → 일러스트 SVG 파일 매핑. public/elements/*.svg (1024 정사각, 컬러 내장).
// 이모지(EL_EMOJI) 대체용 — 전 화면 공통.
export const ELEMENT_ICON: Record<string, string> = {
  목: "/elements/Tree.svg",
  화: "/elements/Fire.svg",
  토: "/elements/Soil.svg",
  금: "/elements/Gold.svg",
  수: "/elements/Water.svg",
};

export function elementIconSrc(element: string): string | undefined {
  return ELEMENT_ICON[element];
}
