<p align="center">
  <img src="public/readme_head.png" alt="Lucky Matching — 어디 갈지 고민될 땐, 럭키매칭에게 물어봐!" width="100%">
</p>

# Lucky Matching

생년월일 → 사주(만세력) → **오행 기운** 기반으로 나에게 맞는 여행 지역과 관광상품을 추천 + **일간 사주예보(오늘의 운)**.
OBA WEEKENDTHON · 마이리얼트립 트랙.

## 아키텍처

```
[Next.js on Vercel]                          [Python 사주서버 (별도 레포, OSS)]
  app/page.tsx ──(브라우저 fetch)──────────▶  /api/v1/saju/summary
                                              /api/v1/forecast/daily
  app/api/products/route.ts ──(서버, MCP)──▶  MyRealTrip MCP
  app/api/explain/route.ts  ──(서버, 키안전)─▶  OpenAI (한줄 해설)
```

- **사주 엔진**: 순수 만세력 계산(`manseryeok × sajupy` 듀얼엔진). 공개 API, 키 불필요. 별도 레포로 OSS 공개.
- **이 앱**: UI + MyRealTrip/OpenAI BFF. 모든 키는 서버(`app/api/*`)에서만 사용 → 브라우저 노출 0.

## 실행

```bash
npm install
cp .env.example .env.local   # OPENAI 키 등 입력 (SAJU_API는 기본값 내장)
npm run dev                  # http://localhost:3000
```

사주 API는 이미 배포돼 있어 키 없이도 바로 동작합니다(기본 URL 내장). OpenAI 한줄 해설은 키가 없으면 템플릿 문구로 폴백합니다.

## 환경 변수 (.env.local)

| 키 | 용도 | 노출 |
|---|---|---|
| `OPENAI_API_KEY` | 욕망별 추천 한줄 해설(서버) | 서버 전용 |
| `NEXT_PUBLIC_SAJU_API` | 사주 엔진 URL(기본값 내장) | 공개(공개 API) |
| `MYREALTRIP_API_KEY` | (선택) REST 폴백용 | 서버 전용 |

> MyRealTrip 상품은 기본적으로 **MCP**로 연동되어 별도 키 없이 동작합니다.

## 4스텝 흐름

1. **입력** — 생년월일만 (태어난 시간/성별/경도 X)
2. **정체성 + 운세** — 일간 오행 페르소나 + 오늘의 운 점수 + 공유 카드
3. **사주 디테일** — 사주명식 + 신강/신약·용신 + 오행 레이더/분포
4. **추천** — 욕망별(재물·승진·사업·애정·건강) 맞춤 + 오방 지도 + MyRealTrip 상품

스텝 사이에 '분석 중…' 리빌 한 박자.

## 오방 지도 / 매핑 룰셋

전국 250개 시군구를 전통 방위론 + 풍수 형기론으로 오행 매핑(인터랙티브 지도 L1~L3).
- 매핑 근거/알고리즘: [`docs/element-mapping-v1.md`](docs/element-mapping-v1.md)
- 생성기(재현): `node scripts/gen-elements.mjs` → `lib/municipalityElements.ts`

## 배포 (Vercel)

```bash
npx vercel            # 최초 링크 + preview
npx vercel --prod     # 프로덕션
```

Vercel Project Settings > Environment Variables 에 `OPENAI_API_KEY` 추가(서버 전용).

## 면책

사주 해석과 추천 문구는 재미를 위한 콘텐츠이며 AI가 생성한 결과입니다. 특정 지역에 대한 우열을 뜻하지 않습니다.
