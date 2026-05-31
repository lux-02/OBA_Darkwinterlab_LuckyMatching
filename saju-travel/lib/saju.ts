import type { SajuInput, SummaryResponse, Forecast } from "./types";

// 사주 엔진(공개 API, 키 불필요). 클라이언트에서 직접 호출.
const SAJU_API =
  process.env.NEXT_PUBLIC_SAJU_API ??
  "https://saju-git-main-lux02s-projects.vercel.app";

export async function fetchSummary(input: SajuInput): Promise<SummaryResponse> {
  // 시간 미입력 → time_known:false. 서버가 연·월·일 삼주(三柱)만으로 오행분포·강약·용신을
  // 계산해 임의 시주의 왜곡을 제거한다. hour는 일주(일간) 산출용으로만 정오 고정.
  const body = { ...input, hour: 12, minute: 0, use_solar_time: false, time_known: false };
  const res = await fetch(`${SAJU_API}/api/v1/saju/summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`summary 호출 실패 (${res.status})`);
  return res.json();
}

export async function fetchForecast(
  dayStem: string,
  favorable: string[],
  unfavorable: string[],
  date?: string,
): Promise<Forecast> {
  const params = new URLSearchParams({
    day_stem: dayStem,
    favorable: favorable.join(","),
    unfavorable: unfavorable.join(","),
  });
  if (date) params.set("date", date);
  const res = await fetch(`${SAJU_API}/api/v1/forecast/daily?${params}`);
  if (!res.ok) throw new Error(`forecast 호출 실패 (${res.status})`);
  return res.json();
}
