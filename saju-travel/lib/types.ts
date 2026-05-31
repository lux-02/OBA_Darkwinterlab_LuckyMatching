export interface Pillar {
  hanja: string | null;
  hangul: string | null;
}

export interface RegionRec {
  element: string;
  direction: string;
  color: string;
  terrain: string;
  rationale: string;
  regions: string[];
  categories: string[];
}

export interface Strength {
  type: string; // 신강 | 신약 | 중화
  mode: string; // amplify | supplement | balance
  support_ratio: number;
  day_master_element: string;
  favorable_elements: string[];
  unfavorable_elements: string[];
}

export interface Interpretation {
  strength: Strength;
  dominant_element: string;
  deficient_element: string;
  recommended_elements: string[];
  avoid_elements: string[];
  recommended_regions: RegionRec[];
  avoid_regions: RegionRec[];
}

export interface SummaryResponse {
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar };
  elements: Record<string, number>;
  interpretation: Interpretation;
  resolution: string;
  validation_matches: boolean;
}

export interface Forecast {
  date: string;
  today_pillar: string;
  today_element: string;
  today_ten_god: string;
  score: number;
  verdict: string; // 길(吉) | 주의 | 평(平)
  headline: string;
  region: RegionRec;
}

export interface Product {
  name: string;
  meta: string;
  url?: string;
  image?: string;
  thumbEmoji?: string;
  mock?: boolean;
}

// 사용자 입력은 생년월일 + 양/음력만. 시간/성별/경도는 추천 결과에 영향 없어 제거.
export interface SajuInput {
  calendar_type: "solar" | "lunar";
  year: number;
  month: number;
  day: number;
}
