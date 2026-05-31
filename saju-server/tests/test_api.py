from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import app

FIXTURES_PATH = Path(__file__).resolve().parent / "fixtures" / "edge_cases.json"
CASES = json.loads(FIXTURES_PATH.read_text(encoding="utf-8"))
client = TestClient(app)


def _case_id(case: dict[str, object]) -> str:
    return str(case["id"])


def test_healthz() -> None:
    response = client.get("/healthz")

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["service_engine"] == "manseryeok"
    assert payload["validator_engine"] == "sajupy"


def test_openapi_includes_saju_response_schema() -> None:
    response = client.get("/openapi.json")

    assert response.status_code == 200
    payload = response.json()
    schema = payload["paths"]["/api/v1/saju"]["post"]["responses"]["200"]["content"]["application/json"]["schema"]

    assert schema["$ref"].endswith("/SajuResponse")


def test_summary_three_pillar_excludes_hour() -> None:
    """time_known=False면 오행분포·강약·용신이 연·월·일 삼주로만 계산되고,
    임의의 정오 시주가 분포에 섞이지 않으며 시주 표기가 null이어야 한다."""
    base = {
        "calendar_type": "solar",
        "year": 1996,
        "month": 5,
        "day": 15,
        "hour": 12,
        "minute": 0,
        "use_solar_time": False,
    }

    full = client.post("/api/v1/saju/summary", json={**base, "time_known": True}).json()
    three = client.post("/api/v1/saju/summary", json={**base, "time_known": False}).json()

    # 일주(일간)는 시간과 무관하게 동일해야 한다.
    assert full["pillars"]["day"]["hanja"] == three["pillars"]["day"]["hanja"]

    # 삼주 모드는 시주를 null로 명시한다.
    assert three["pillars"]["hour"] == {"hanja": None, "hangul": None}
    assert three["time_known"] is False

    # 정오 시주(丙午)의 화(火) 가중치가 빠지므로 분포가 달라져야 한다.
    assert full["elements"] != three["elements"]
    assert three["elements"]["화"] <= full["elements"]["화"]

    # 오행 키 집합은 동일하게 유지.
    assert set(three["elements"]) == {"목", "화", "토", "금", "수"}


@pytest.mark.parametrize("case", CASES, ids=_case_id)
def test_edge_cases(case: dict[str, object]) -> None:
    response = client.post("/api/v1/saju", json=case["request"])

    assert response.status_code == 200
    payload = response.json()
    expected = case["expected"]

    assert payload["authoritative_engine"] == expected["authoritative_engine"]
    assert payload["resolution"] == expected["resolution"]
    assert payload["validation"]["matches"] is expected["validation_matches"]

    authoritative = payload["authoritative_result"]["pillars"]
    assert authoritative["year"]["hanja"] == expected["pillars"]["year"]
    assert authoritative["month"]["hanja"] == expected["pillars"]["month"]
    assert authoritative["day"]["hanja"] == expected["pillars"]["day"]
    assert authoritative["hour"]["hanja"] == expected["pillars"]["hour"]
