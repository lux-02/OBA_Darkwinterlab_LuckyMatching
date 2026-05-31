from __future__ import annotations

from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def test_reference_sample_matches_attached_screenshots() -> None:
    response = client.post(
        "/api/v1/saju",
        json={
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
            "fortune_years_before": 6,
            "fortune_years_after": 6,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    authoritative = payload["authoritative_result"]
    derived = authoritative["derived"]
    natal = derived["natal"]
    fortunes = derived["fortunes"]

    assert authoritative["pillars"]["year"]["hanja"] == "庚辰"
    assert authoritative["pillars"]["month"]["hanja"] == "戊子"
    assert authoritative["pillars"]["day"]["hanja"] == "壬子"
    assert authoritative["pillars"]["hour"]["hanja"] == "庚子"

    assert natal["ten_gods"]["stems"] == {
        "year": "편인",
        "month": "편관",
        "day": "일간",
        "hour": "편인",
    }
    assert natal["ten_gods"]["branches"] == {
        "year": "편관",
        "month": "겁재",
        "day": "겁재",
        "hour": "겁재",
    }

    assert [
        (item["stem"]["hangul"], item["ten_god"], item["phase"])
        for item in natal["hidden_stems"]["year"]
    ] == [
        ("을", "상관", "여기"),
        ("계", "겁재", "중기"),
        ("무", "편관", "정기"),
    ]
    assert [
        (item["stem"]["hangul"], item["ten_god"], item["phase"])
        for item in natal["hidden_stems"]["month"]
    ] == [
        ("임", "비견", "여기"),
        ("계", "겁재", "정기"),
    ]

    assert natal["twelve_fortunes"]["by_day_master"] == {
        "year": "묘",
        "month": "제왕",
        "day": "제왕",
        "hour": "제왕",
    }
    assert natal["twelve_fortunes"]["by_pillar_stem"] == {
        "year": "양",
        "month": "태",
        "day": "제왕",
        "hour": "사",
    }
    assert natal["twelve_sinsal"] == {
        "year": "화개",
        "month": "장성",
        "day": "장성",
        "hour": "장성",
    }
    assert [
        (item["branch"]["hangul"], item["ten_god"])
        for item in natal["gongmang"]
    ] == [("인", "식신"), ("묘", "상관")]
    assert "괴강살" in natal["special_stars"]["year"]

    assert derived["distribution"]["display"] == {
        "self": 60,
        "output": 0,
        "wealth": 0,
        "power": 20,
        "resource": 10,
    }

    daeun = fortunes["daeun"]
    assert daeun["start_age"] == 5
    assert daeun["direction"] == "forward"
    assert [period["pillar"]["hanja"] for period in daeun["periods"][:10]] == [
        "己丑",
        "庚寅",
        "辛卯",
        "壬辰",
        "癸巳",
        "甲午",
        "乙未",
        "丙申",
        "丁酉",
        "戊戌",
    ]
    assert daeun["periods"][2]["stem_ten_god"] == "정인"
    assert daeun["periods"][2]["branch_ten_god"] == "상관"
    assert daeun["periods"][2]["twelve_fortune"]["by_day_master"] == "사"
    assert daeun["periods"][2]["twelve_fortune"]["by_pillar_stem"] == "절"

    seun_2026 = next(item for item in fortunes["seun"]["years"] if item["year"] == 2026)
    assert seun_2026["display_age"] == 26
    assert seun_2026["pillar"]["hanja"] == "丙午"
    assert seun_2026["stem_ten_god"] == "편재"
    assert seun_2026["branch_ten_god"] == "정재"
    assert seun_2026["twelve_fortune"]["by_day_master"] == "태"
    assert seun_2026["twelve_fortune"]["by_pillar_stem"] == "제왕"

    wolun_2026_04 = next(item for item in fortunes["wolun"]["months"] if item["month"] == 4)
    assert wolun_2026_04["pillar"]["hanja"] == "壬辰"
    assert wolun_2026_04["stem_ten_god"] == "비견"
    assert wolun_2026_04["branch_ten_god"] == "편관"
    assert wolun_2026_04["twelve_fortune"]["by_day_master"] == "묘"
    assert wolun_2026_04["twelve_fortune"]["by_pillar_stem"] == "묘"

    wolun_2026_01 = next(item for item in fortunes["wolun"]["months"] if item["month"] == 1)
    assert wolun_2026_01["pillar"]["hanja"] == "辛丑"
