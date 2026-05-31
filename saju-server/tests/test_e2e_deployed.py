from __future__ import annotations

import os

import httpx
import pytest

BASE_URL = os.getenv("SAJU_E2E_BASE_URL")

if not BASE_URL:
    pytest.skip("SAJU_E2E_BASE_URL is not set", allow_module_level=True)


def test_deployed_api_health_and_sample_response() -> None:
    sample_payload = {
        "calendar_type": "solar",
        "year": 2000,
        "month": 12,
        "day": 20,
        "hour": 1,
        "minute": 0,
        "longitude": 126.978,
        "utc_offset": 9,
        "use_solar_time": True,
        "early_zi_time": True,
        "gender": "male",
        "fortune_reference_year": 2026,
    }

    with httpx.Client(base_url=BASE_URL, timeout=30.0, follow_redirects=True) as client:
        root_response = client.get("/")
        health_response = client.get("/healthz")
        saju_response = client.post("/api/v1/saju", json=sample_payload)

    assert root_response.status_code == 200
    assert root_response.json() == {
        "service": "saju-validated-api",
        "service_engine": "manseryeok",
        "validator_engine": "sajupy",
    }

    assert health_response.status_code == 200
    health_payload = health_response.json()
    assert health_payload["ok"] is True
    assert health_payload["service_engine"] == "manseryeok"
    assert health_payload["validator_engine"] == "sajupy"

    assert saju_response.status_code == 200
    payload = saju_response.json()

    assert payload["resolution"] == "service_engine"
    assert payload["authoritative_engine"] == "manseryeok"
    assert payload["validation"]["matches"] is True

    pillars = payload["authoritative_result"]["pillars"]
    assert pillars["year"]["hangul"] == "경진"
    assert pillars["month"]["hangul"] == "무자"
    assert pillars["day"]["hangul"] == "임자"
    assert pillars["hour"]["hangul"] == "경자"

    derived = payload["authoritative_result"]["derived"]
    assert derived["distribution"]["display"] == {
        "self": 60,
        "output": 0,
        "wealth": 0,
        "power": 20,
        "resource": 10,
    }
    assert derived["fortunes"]["daeun"]["start_age"] == 5

    seun_2026 = next(item for item in derived["fortunes"]["seun"]["years"] if item["year"] == 2026)
    wolun_2026_04 = next(item for item in derived["fortunes"]["wolun"]["months"] if item["month"] == 4)

    assert seun_2026["pillar"]["hangul"] == "병오"
    assert wolun_2026_04["pillar"]["hangul"] == "임진"
