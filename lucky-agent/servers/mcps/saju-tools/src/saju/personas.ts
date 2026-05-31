// 오행별 정체성 — 일간(日干) 기준 "너는 이런 사람" 한 줄. 프로필·공유 자랑 후킹용.
export interface Persona { tag: string; line: string }

export const ELEMENT_PERSONA: Record<string, Persona> = {
  목: { tag: "가만 못 있는 성장형", line: "네잎클로버처럼 어디서든 행운을 틔우는 타입" },
  화: { tag: "열정 그 자체", line: "한번 불붙으면 끝까지 가는 에너지 폭발형" },
  토: { tag: "믿고 보는 든든함", line: "곁에 있으면 마음이 놓이는 타입" },
  금: { tag: "예리하고 명료한 스타일", line: "군더더기 없이 멋있는 타입" },
  수: { tag: "잘 들어주고 유연한 타고난 리더", line: "어디든 스며드는 타입" },
};

export function personaOf(element: string): Persona {
  return ELEMENT_PERSONA[element] ?? { tag: "균형 잡힌 사람", line: "어디든 자연스럽게 어울리는 타입" };
}
