// 욕망 5선 → 십성 → "그 사람의 오행"(일간마다 다름) → 강약으로 채움/받침 개인화.
// 핵심: 같은 욕망도 사주(일간·강약·분포)에 따라 추천 오행·지역·상품이 달라진다.

// 오행 상생(生)·상극(剋)
const GEN: Record<string, string> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" }; // X가 생하는 것
const DES: Record<string, string> = { 목: "토", 화: "금", 토: "수", 금: "목", 수: "화" }; // X가 극하는 것

type Group = "self" | "output" | "wealth" | "power" | "resource";

// 일간 오행 기준 십성 → 오행 (일간마다 달라짐)
export function relationElements(day: string): Record<Group, string> {
  return {
    self: day, // 비겁
    output: GEN[day], // 식상 (일간이 생)
    wealth: DES[day], // 재성 (일간이 극)
    power: Object.keys(DES).find((k) => DES[k] === day)!, // 관성 (일간을 극)
    resource: Object.keys(GEN).find((k) => GEN[k] === day)!, // 인성 (일간을 생)
  };
}

const GROUP_TEN: Record<Group, string> = { self: "비겁", output: "식상", wealth: "재성", power: "관성", resource: "인성" };

export type DesireKey = "재물" | "승진" | "사업" | "애정" | "건강";

// 욕망 → 후보 십성(여럿이면 '그 사람이 더 부족한' 쪽 선택). v2 정교화.
export const DESIRES: { key: DesireKey; emoji: string; label: string; groups: Group[] }[] = [
  { key: "재물", emoji: "💰", label: "재물운", groups: ["wealth"] }, // 재성
  { key: "승진", emoji: "🏆", label: "승진·명예", groups: ["power"] }, // 관성
  { key: "사업", emoji: "🚀", label: "사업·재능", groups: ["output"] }, // 식상(식신생재)
  { key: "애정", emoji: "💞", label: "애정·인연", groups: ["power", "wealth"] }, // 관성·재성(배우자·이성·인연)
  { key: "건강", emoji: "🌿", label: "건강·안정", groups: ["resource", "self"] }, // 인성·비겁(보호·회복·체력)
];

export interface DesireResult {
  target: string;
  element: string;
  ten: string;
  mode: "fill" | "support";
}

// 욕망 → (그 사람의) 추천 오행 + 십성 + 채움/받침 모드
export function computeDesire(
  dayElement: string,
  elements: Record<string, number>,
  favorable: string[],
  avoid: string[],
  desire: (typeof DESIRES)[number],
): DesireResult {
  const rel = relationElements(dayElement);
  // 후보 십성들 중 '분포가 가장 낮은(부족한)' 오행을 그 사람의 핵심으로.
  const candidates = desire.groups.map((g) => ({ g, el: rel[g] }));
  candidates.sort((a, b) => (elements[a.el] ?? 0) - (elements[b.el] ?? 0));
  const { g, el: target } = candidates[0];
  const ten = GROUP_TEN[g];

  // 이미 과다 → 직접 채우면 역효과, 용신으로 받쳐 '쓸 수 있게'
  if (avoid.includes(target)) {
    return { target, element: favorable[0] ?? target, ten, mode: "support" };
  }
  return { target, element: target, ten, mode: "fill" };
}
