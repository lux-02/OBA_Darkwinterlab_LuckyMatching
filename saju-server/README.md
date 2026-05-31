# Saju FastAPI Server for Vercel

FastAPI 기반 사주 계산 서버다. 계산 엔진은 `@fullstackfamily/manseryeok`, 검증 엔진은 `sajupy`를 사용한다.

## Architecture

- `manseryeok`: 서비스 계산 엔진
- `sajupy`: 정확도 검증 엔진
- `validator_fallback`: 두 엔진이 다르거나 서비스 엔진이 지원하지 않는 입력이면 `sajupy` 결과를 권위값으로 승격

특히 아래 경계 케이스를 회귀 테스트로 고정했다.

- 입춘 직전/직후
- 절기 교체 당일
- 23:00~01:00
- 한국 외 지역 출생
- 음력 윤달 입력
- 분 단위 시주 경계

## Local Setup

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
npm install
npm run build:bridge
pytest
```

로컬 실행:

```bash
uvicorn app:app --reload
```

## API

`POST /api/v1/saju`

```json
{
  "calendar_type": "solar",
  "year": 1990,
  "month": 10,
  "day": 10,
  "hour": 14,
  "minute": 30,
  "longitude": 126.978,
  "utc_offset": 9,
  "use_solar_time": true,
  "early_zi_time": true
}
```

응답은 권위 결과, 엔진별 원시 결과, 불일치 필드를 함께 돌려준다.

### `POST /api/v1/saju/summary` (라이트 모드)

프론트가 추천에 바로 쓰는 핵심 필드(명식 + 오행분포 + 강약·용신 + 오방 지역)만 반환한다.

- `time_known: false` — 출생 시간 미상. 오행분포·신강/신약·용신을 **연·월·일 삼주(三柱)** 로만 계산해, 임의로 채운 시주(예: 정오 `午`)가 결과를 왜곡하지 않게 한다. 응답의 `pillars.hour` 는 `null` 로 내려간다. 일주(일간)는 시간과 무관하게 동일하다.
- `time_known: true` (기본값) — 시주 포함 4주로 계산.

> 4주 vs 삼주는 실제로 결과가 갈린다. 예) 1996-05-15 입력 시 정오 시주 `丙午`(화)가 섞이면 강약이 "중화"로, 빼면 "신강"으로 바뀌고 용신도 `[목]` → `[목·화·토]` 로 달라진다.

## Vercel

Vercel은 루트 `app.py`의 `app` 인스턴스를 FastAPI 엔트리포인트로 사용한다. 배포 전에 `npm run build:bridge`로 `manseryeok` 번들을 생성하도록 `pyproject.toml`의 `tool.vercel.scripts.build`를 설정했다.

