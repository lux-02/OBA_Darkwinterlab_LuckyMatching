// "왜 나에게 이곳인지" — 친구가 옆에서 봐주듯, 오행의 기운을 사람의 상태로 연결한 한줄.
// 단순 "수 부족/목 강함"이 아니라, 그래서 *너에게* 이 장소가 왜 맞는지.
const BECAUSE: Record<string, string> = {
  목: "요즘 좀 막혀 있지 않아? 숲에 들어가면 굳었던 게 스르르 풀릴 거야.",
  화: "요즘 좀 처져 있지 않아? 노을이든 불멍이든, 뜨끈한 데 가서 다시 지피고 와.",
  토: "요즘 여기저기 휘둘리지 않아? 오래되고 단단한 동네에서 중심 좀 잡고 와.",
  금: "요즘 생각이 너무 많지 않아? 도시의 깔끔한 선들이 머리를 비워줄 거야.",
  수: "요즘 좀 쉴 틈 없지 않아? 파도 소리 들으면서 가만히 좀 가라앉히고 와.",
};

export function becauseLine(element: string): string {
  return BECAUSE[element] ?? "여기, 지금 너한테 딱이야.";
}

// 욕망 패널용 — 채움/받침 모드까지 살린 친구 톤 한줄.
export function desireBecause(desireLabel: string, target: string, element: string, mode: "fill" | "support"): string {
  if (mode === "support") {
    return `이미 ${target} 기운은 충분해. 대신 ${element} 기운으로 받쳐주는 게 너한텐 더 나아 — ${becauseLine(element)}`;
  }
  return `${desireLabel}, 너한텐 ${target} 기운에서 와. ${becauseLine(element)}`;
}
