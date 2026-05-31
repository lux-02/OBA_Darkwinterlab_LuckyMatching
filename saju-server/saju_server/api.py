from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from saju_server.derived import (
    STEM_INFO,
    THREE_PILLAR_KEYS,
    build_distribution_section,
    split_pillar,
)
from saju_server.interpretation import build_interpretation, score_daily
from saju_server.models import CalculationRequest
from saju_server.response_models import SajuResponse
from saju_server.service import ValidatedSajuService

SEOUL_TZ = ZoneInfo("Asia/Seoul")
PILLAR_KEYS = ("year", "month", "day", "hour")

service = ValidatedSajuService()
app = FastAPI(title="Saju Validated API", version="0.2.0")

# 해커톤 프론트(브라우저/Vercel)에서 직접 호출 가능하도록 CORS 개방.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict[str, str]:
    return {
        "service": "saju-validated-api",
        "service_engine": "manseryeok",
        "validator_engine": "sajupy",
    }


@app.get("/healthz")
def healthz() -> dict[str, object]:
    return service.health()


@app.post("/api/v1/saju", response_model=SajuResponse)
def calculate_saju(payload: CalculationRequest) -> SajuResponse:
    try:
        return service.calculate(payload)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/v1/saju/summary")
def calculate_saju_summary(payload: CalculationRequest) -> dict:
    """라이트 모드: 프론트가 추천에 바로 쓰는 핵심 필드만 반환.

    명식 4주 + 오행분포 + 신강/신약·용신 + 오방 추천/회피 지역.
    풀 응답(engines/validation/hidden_stems 등)은 /api/v1/saju 사용.
    """
    try:
        result = service.calculate(payload)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    authoritative = result["authoritative_result"]
    derived = authoritative["derived"]
    day_stem = authoritative["pillars"]["day"]["hanja"][0]

    if payload.time_known:
        # 4주 분포 그대로 사용.
        distribution = derived["distribution"]
    else:
        # 시간 미상 → 연·월·일 삼주만으로 분포 재계산 (임의 시주 왜곡 제거).
        pillars_map = {
            key: split_pillar(authoritative["pillars"][key]["hanja"])
            for key in PILLAR_KEYS
        }
        distribution = build_distribution_section(
            pillars_map, payload.gender, pillar_keys=THREE_PILLAR_KEYS
        )

    interpretation = build_interpretation(distribution, day_stem)

    def pillar_payload(key: str) -> dict:
        # 시간 미상이면 시주는 의미 없으므로 null로 명시.
        if key == "hour" and not payload.time_known:
            return {"hanja": None, "hangul": None}
        return {
            "hanja": authoritative["pillars"][key].get("hanja"),
            "hangul": authoritative["pillars"][key].get("hangul"),
        }

    return {
        "pillars": {key: pillar_payload(key) for key in PILLAR_KEYS},
        "elements": distribution["elements"],
        "interpretation": interpretation,
        "time_known": payload.time_known,
        "resolution": result["resolution"],
        "validation_matches": result["validation"]["matches"],
    }


@app.get("/api/v1/forecast/daily")
def daily_forecast(
    day_stem: str,
    favorable: str = "",
    unfavorable: str = "",
    date: str | None = None,
) -> dict:
    """일간 사주예보: 오늘의 일진(매일 변동) × 내 사주(고정).

    day_stem: 내 일간 한자(예: 甲). summary 응답 pillars.day.hanja[0].
    favorable/unfavorable: 콤마 구분 오행(예: 수,목). summary interpretation에서 획득.
    date: YYYY-MM-DD(미지정 시 한국 기준 오늘). 동일 입력은 결정론적이라 캐시 가능.
    """
    if day_stem not in STEM_INFO:
        raise HTTPException(status_code=400, detail=f"invalid day_stem: {day_stem}")

    target = date or datetime.now(SEOUL_TZ).date().isoformat()
    try:
        year, month, day = (int(part) for part in target.split("-"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD") from exc

    today_request = CalculationRequest(
        year=year, month=month, day=day, hour=12, minute=0, use_solar_time=False
    )
    try:
        today_result = service.calculate(today_request)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    day_pillar = today_result["authoritative_result"]["pillars"]["day"]["hanja"]
    today_stem = day_pillar[0]
    today_element = STEM_INFO[today_stem].element

    favorable_list = [element for element in favorable.split(",") if element]
    unfavorable_list = [element for element in unfavorable.split(",") if element]

    forecast = score_daily(day_stem, today_stem, today_element, favorable_list, unfavorable_list)
    return {"date": target, "today_pillar": day_pillar, **forecast}
