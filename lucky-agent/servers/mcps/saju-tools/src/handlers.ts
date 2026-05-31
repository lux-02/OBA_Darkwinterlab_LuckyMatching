/**
 * MCP tool registrations for the Lucky Matching saju MCP server.
 *
 * Tools (descriptions ARE the agent's API — written as user-facing guidance):
 *   - get_saju            — 명식·오행·일간·용신·페르소나 (정체성/오행 UI의 데이터 소스)
 *   - daily_forecast      — 그날의 일진·오늘의 운 점수 (매일 바뀜)
 *   - recommend_by_desire — 욕망(재물/승진/사업/애정/건강) → 사주별 개인화 추천 오행·지역·활동
 *   - recommend_by_region — 특정 지역 ↔ 내 사주 궁합
 *
 * Each tool wraps the public saju engine API (src/saju/saju.ts) + ported
 * pure-TS mapping logic. Returns data as JSON text; the agent describes the
 * UI to ggui_render. Tools NEVER render UI themselves.
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fetchSummary, fetchForecast } from './saju/saju';
import { personaOf } from './saju/personas';
import { DESIRES, computeDesire } from './saju/desires';
import { ELEMENT_REGIONS, ELEMENT_ACTIVITIES, ELEMENT_DIRECTION } from './saju/regions';
import { becauseLine, desireBecause } from './saju/explain';
import type { SajuInput } from './saju/types';

// 공통 생년월일 입력 (시간·성별 불필요 — 일간/용신은 생년월일로 결정).
const birthInput = {
  year: z.number().int().min(1900).max(2050).describe('태어난 연도. 예: 1996'),
  month: z.number().int().min(1).max(12).describe('태어난 월 (1-12)'),
  day: z.number().int().min(1).max(31).describe('태어난 일 (1-31)'),
  calendar_type: z
    .enum(['solar', 'lunar'])
    .default('solar')
    .describe('양력=solar, 음력=lunar. 모르면 solar.'),
};

const asText = (obj: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(obj) }],
});

const toInput = (i: { year: number; month: number; day: number; calendar_type: 'solar' | 'lunar' }): SajuInput => ({
  calendar_type: i.calendar_type,
  year: i.year,
  month: i.month,
  day: i.day,
});

export function registerSajuTools(server: McpServer): void {
  server.registerTool(
    'get_saju',
    {
      title: '사주 · 명식/오행',
      description:
        '생년월일로 사주 명식·오행 분포·일간(나의 본질 오행)·필요한 기운(용신)·성격 페르소나를 계산한다. ' +
        '사용자가 사주/오행/내 기운/내 타입이 궁금하다고 하면 가장 먼저 호출한다. ' +
        '결과로 정체성 카드와 오행 분포 UI를 그릴 수 있다.',
      inputSchema: birthInput,
    },
    async (i) => {
      const s = await fetchSummary(toInput(i));
      const dayEl = s.interpretation.strength.day_master_element;
      return asText({
        pillars: {
          year: s.pillars.year.hangul,
          month: s.pillars.month.hangul,
          day: s.pillars.day.hangul,
        },
        day_master_element: dayEl,
        day_stem_hanja: s.pillars.day.hanja, // daily_forecast 입력에 재사용 가능
        persona: personaOf(dayEl), // { tag, line }
        elements: s.elements, // { 목,화,토,금,수 }
        dominant_element: s.interpretation.dominant_element,
        deficient_element: s.interpretation.deficient_element,
        recommended_elements: s.interpretation.recommended_elements,
        avoid_elements: s.interpretation.avoid_elements,
        strength: s.interpretation.strength.type, // 신강/신약/중화
      });
    },
  );

  server.registerTool(
    'daily_forecast',
    {
      title: '사주 · 오늘의 운',
      description:
        "생년월일(+선택 날짜 YYYY-MM-DD)로 그날의 일진과 '오늘의 운' 점수(0-100)·헤드라인·추천 지역을 계산한다. " +
        '매일 바뀐다. 사용자가 오늘 운/이 날 운/언제가 좋아를 물으면 호출한다. 날짜를 생략하면 오늘 기준.',
      inputSchema: {
        ...birthInput,
        date: z.string().optional().describe('YYYY-MM-DD. 생략 시 오늘.'),
      },
    },
    async (i) => {
      const s = await fetchSummary(toInput(i));
      const stem = s.pillars.day.hanja?.[0];
      if (!stem) return asText({ error: '일간 계산 실패' });
      const f = await fetchForecast(
        stem,
        s.interpretation.recommended_elements,
        s.interpretation.avoid_elements,
        i.date,
      );
      return asText({
        date: f.date,
        score: f.score,
        verdict: f.verdict,
        today_pillar: f.today_pillar,
        today_element: f.today_element,
        today_ten_god: f.today_ten_god,
        headline: f.headline,
        recommended_regions: f.region?.regions ?? [],
      });
    },
  );

  server.registerTool(
    'recommend_by_desire',
    {
      title: '욕망별 맞춤 추천',
      description:
        '사용자의 욕망(재물/승진/사업/애정/건강)에 대해, 그 사람의 사주로 개인화된 추천 오행·기운·지역·개운 활동·한줄 이유를 계산한다. ' +
        '같은 욕망도 사주마다 답이 다르다. 사용자가 돈/연애/일/건강/승진 등을 원하면 호출한다.',
      inputSchema: {
        ...birthInput,
        desire: z
          .enum(['재물', '승진', '사업', '애정', '건강'])
          .describe('5대 욕망 중 하나'),
      },
    },
    async (i) => {
      const s = await fetchSummary(toInput(i));
      const d = DESIRES.find((x) => x.key === i.desire) ?? DESIRES[0];
      const r = computeDesire(
        s.interpretation.strength.day_master_element,
        s.elements,
        s.interpretation.recommended_elements,
        s.interpretation.avoid_elements,
        d,
      );
      return asText({
        desire: d.label,
        element: r.element,
        ten: r.ten,
        mode: r.mode, // fill | support
        direction: ELEMENT_DIRECTION[r.element],
        regions: ELEMENT_REGIONS[r.element] ?? [],
        activities: ELEMENT_ACTIVITIES[r.element] ?? [],
        because: desireBecause(d.label, r.target, r.element, r.mode),
      });
    },
  );

  server.registerTool(
    'recommend_by_region',
    {
      title: '지역 궁합',
      description:
        "특정 지역과 내 사주의 궁합을 본다. 그 지역의 대표 오행·나에게 맞는지·어울리는 개운 활동·'왜 너에게'를 반환한다. " +
        "사용자가 '○○ 어때?', '○○ 가도 돼?' 처럼 특정 지역을 물으면 호출한다.",
      inputSchema: {
        ...birthInput,
        region: z.string().describe('지역 이름. 예: 부산, 강릉, 제주, 설악산'),
      },
    },
    async (i) => {
      const s = await fetchSummary(toInput(i));
      const q = i.region.trim();
      // ELEMENT_REGIONS 역매핑 (대표 지역 fuzzy contains).
      let el: string | undefined;
      for (const [e, names] of Object.entries(ELEMENT_REGIONS)) {
        if (names.some((n) => n.includes(q) || q.includes(n.split(/[·,( ]/)[0]))) {
          el = e;
          break;
        }
      }
      return asText({
        region: q,
        element: el ?? null,
        matches_you: el ? s.interpretation.recommended_elements.includes(el) : false,
        direction: el ? ELEMENT_DIRECTION[el] : null,
        activities: el ? ELEMENT_ACTIVITIES[el] ?? [] : [],
        because: el
          ? becauseLine(el)
          : '이 지역은 아직 오행 데이터가 없어 — 지도에서 골라줄래?',
      });
    },
  );
}
