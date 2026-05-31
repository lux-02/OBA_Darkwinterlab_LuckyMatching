<p align="center">
  <img src="readme_head.png" alt="Lucky Matching — 어디 갈지 고민될 땐, 럭키매칭에게 물어봐!" width="100%">
</p>

<h1 align="center">Lucky Matching · 사주로 떠나는 국내 여행</h1>

<p align="center">
  <b>생년월일(사주 오행)로 “오늘 나와 맞는 국내 여행지”를 찾아주는 AI 여행 추천 서비스</b><br/>
  AI가 텍스트로 답하지 않습니다 — <b>지도·카드 UI를 실시간으로 생성</b>해 보여주고, 그 자리에서 실제 여행 상품까지 연결합니다.
</p>

<p align="center">
  🔗 <b><a href="https://luckymatching.n2f.site">라이브 데모 — luckymatching.n2f.site</a></b>
</p>

<p align="center">
  <i>팀 Darkwinterlab</i>
</p>

---

## 🏆 스폰서 기술 활용

이 프로젝트는 세 스폰서의 핵심 기술을 실제 제품 흐름에 녹였습니다.

| 스폰서 | 기술 | 우리가 쓴 방식 |
|---|---|---|
| **OpenAI** (메인) | **OpenAI Agents SDK** (`@openai/agents`) | `lucky-agent`의 대화형 백엔드가 OpenAI Agents SDK로 동작. 사용자의 사주 컨텍스트를 받아 도구(MCP)를 호출하고 답을 구성합니다. UI 생성(GGUI)도 OpenAI 모델로 구동. |
| **GGUI** (프리미엄) | **GGUI 프로토콜** (생성형 UI) | “럭키매칭에게 물어봐” 대화에서 에이전트가 **자연어로 UI를 묘사 → GGUI가 인터랙티브 화면(운세 카드·지도)을 실시간 생성** → 사용자의 클릭을 다시 읽어 반응. 텍스트 챗봇이 아니라 *살아있는 UI*가 핵심. |
| **Myrealtrip** (API) | **여행 상품 연동 (MCP)** | 사주가 추천한 오행·지역을 키워드로 **마이리얼트립 실제 여행 상품에 딥링크 연결**. 에이전트에는 `myrealtrip` MCP 도구로 노출 (`GGUI_MYREALTRIP_MCP_URL`), 프론트에서는 `/trips`에서 상품 카드로 연결. “추천 → 예약”까지 한 흐름. |

---

## ✨ 핵심 기능

- **사주 오행 분석** — 생년월일만으로 오행 분포·신강/신약·용신(필요한 기운) 계산 (시간 미상도 삼주(三柱)로 처리)
- **오늘의 운 + 추천 여행지** — 일진(매일 변동) × 내 사주 → 그날 점수와 맞는 지역. 추천지는 날짜·생년월일 시드로 매일/사람마다 다르게
- **오방(五方) 지도** — 드래그·줌인/아웃되는 한국 지도에서 나와 맞는 지역을 오행 색으로 강조, 도 선택 시 시·군·구까지
- **인스타 공유 카드** — 내 오행·오늘의 운·추천 여행지를 담은 9:16(1080×1920) 카드 이미지 저장/공유
- **럭키매칭 대화 (GGUI)** — 사주 맥락을 안고 시작하는 대화형 추천. 답이 카드·지도 UI로 그려짐

---

## 🏗 아키텍처

```
                  ┌──────────────────────────────────────────────┐
   사용자 ───────▶│  saju-travel  (Next.js · Vercel)             │  https://luckymatching.n2f.site
                  │  - 오행 결과 / 오방지도 / 공유카드 / 위저드   │
                  └───────┬───────────────────────┬──────────────┘
                          │ ① 사주 계산            │ ③ 대화 임베드(iframe)
                          ▼                        ▼
        ┌────────────────────────────┐   ┌──────────────────────────────────┐
        │  saju-server (FastAPI)     │   │  lucky-agent (GGUI · Railway)    │
        │  manseryeok + sajupy       │   │  OpenAI Agents SDK 백엔드        │
        │  오행·용신·일진 계산 엔진  │   │   └─ MCP: saju-tools / myrealtrip │
        └────────────────────────────┘   │   └─ GGUI: 자연어 → UI 실시간 생성│
          https://saju-git-main-...        └──────────────────────────────────┘
                                             web: https://web-production-33246.up.railway.app
```

3개 컴포넌트:

| 폴더 | 역할 | 스택 | 배포 |
|---|---|---|---|
| **`saju-travel/`** | 프론트엔드 (위저드·지도·공유카드) | Next.js 14, React 18, react-simple-maps, html2canvas | Vercel |
| **`saju-server/`** | 사주 계산 엔진 (오행·용신·일진) | FastAPI, `manseryeok`(계산) + `sajupy`(검증) | Vercel (Python) |
| **`lucky-agent/`** | 대화형 GGUI 에이전트 (+ MCP 도구) | pnpm 모노레포, OpenAI Agents SDK, GGUI, MCP | Railway (web·agent·ggui·saju-tools) |

---

## 🔁 동작 흐름

1. **생년월일 입력** → `saju-travel`이 `saju-server`에 사주 계산 요청 (오행 분포·용신·오방 지역)
2. **결과 확인** → 오늘의 운, 오방지도, 욕망별·지역별 맞춤 추천, 인스타 공유 카드
3. **“럭키매칭에게 물어봐”** → 사주 맥락을 담아 `lucky-agent`(GGUI) 대화 시작
4. 에이전트가 **`saju-tools` MCP**로 사주/오방 데이터를, **`myrealtrip` MCP**로 여행 상품을 가져와
5. **GGUI가 카드·지도 UI를 실시간 생성**해 답으로 렌더 → 사용자가 클릭하면 다음 턴으로

---

## 🚀 로컬 실행

> 각 컴포넌트는 독립 실행됩니다. 데모는 위 라이브 링크가 가장 빠릅니다.

**1) 사주 엔진 (saju-server)**
```bash
cd saju-server
uv sync                      # 또는 pip install -r requirements.txt
uvicorn saju_server.api:app --reload --port 8000
```

**2) 프론트 (saju-travel)**
```bash
cd saju-travel
npm install
# .env 에 NEXT_PUBLIC_SAJU_API / NEXT_PUBLIC_GGUI_URL 설정 (.env.example 참고)
npm run dev                  # http://localhost:3000
```

**3) GGUI 에이전트 (lucky-agent)**
```bash
cd lucky-agent
pnpm install
cp .env.example .env.local   # OPENAI_API_KEY / ANTHROPIC_API_KEY 등 설정
pnpm dev                     # ggui·todo·agent·web 동시 기동
```

### 환경변수 (요약)
- `saju-travel`: `NEXT_PUBLIC_SAJU_API`, `NEXT_PUBLIC_GGUI_URL`
- `lucky-agent`: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GGUI_SAJU_MCP_URL`, `GGUI_MYREALTRIP_MCP_URL`, `OPENAI_MODEL`
- 🔴 시크릿은 모두 `.env*`(gitignore)로 관리 — 저장소에 키 없음

---

## 🌐 라이브 URL

| 서비스 | URL |
|---|---|
| 메인 (프론트) | https://luckymatching.n2f.site |
| 사주 계산 API | https://saju-git-main-lux02s-projects.vercel.app |
| GGUI 대화 (web) | https://web-production-33246.up.railway.app |

---

## 📁 레포 구조

```
.
├── saju-travel/     # Next.js 프론트 (Vercel)
├── saju-server/     # FastAPI 사주 엔진 (Vercel)
├── lucky-agent/     # GGUI 에이전트 모노레포 (Railway)
│   ├── apps/web/            # 대화 SPA (Vite)
│   └── servers/
│       ├── agent/           # OpenAI Agents SDK 백엔드
│       ├── ggui/            # GGUI serve (UI 생성)
│       └── mcps/saju-tools/ # 사주·오방·욕망 추천 MCP 도구
├── icon/            # 오행 일러스트 에셋
└── readme_head.png
```

---

## ⚠️ 디스클레이머

사주·운세는 **재미와 영감을 위한 참고**입니다. AI가 생성한 결과이며, 안 맞는 지역은 없고 지역마다 다른 기운이 있을 뿐 — 긍정적으로 즐겨주세요.
