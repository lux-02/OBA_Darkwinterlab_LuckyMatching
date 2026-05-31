from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

DEFAULT_LONGITUDE = 126.9780
DEFAULT_UTC_OFFSET = 9.0

STEM_HANGUL = {
    "甲": "갑",
    "乙": "을",
    "丙": "병",
    "丁": "정",
    "戊": "무",
    "己": "기",
    "庚": "경",
    "辛": "신",
    "壬": "임",
    "癸": "계",
}

BRANCH_HANGUL = {
    "子": "자",
    "丑": "축",
    "寅": "인",
    "卯": "묘",
    "辰": "진",
    "巳": "사",
    "午": "오",
    "未": "미",
    "申": "신",
    "酉": "유",
    "戌": "술",
    "亥": "해",
}


def iso_date(year: int, month: int, day: int) -> str:
    return f"{year:04d}-{month:02d}-{day:02d}"


def truncate_to_minute(value: datetime) -> datetime:
    return value.replace(second=0, microsecond=0)


def to_effective_datetime(
    birth_date: date,
    hour: int,
    minute: int,
    *,
    use_solar_time: bool,
    longitude: float | None,
    utc_offset: float,
) -> tuple[datetime, float | None]:
    base_datetime = datetime(birth_date.year, birth_date.month, birth_date.day, hour, minute)

    if not use_solar_time:
        return base_datetime, None

    resolved_longitude = DEFAULT_LONGITUDE if longitude is None else longitude
    correction_minutes = (resolved_longitude - (utc_offset * 15)) * 4
    corrected = truncate_to_minute(base_datetime + timedelta(minutes=correction_minutes))
    return corrected, round(correction_minutes, 1)


def pillar_to_payload(hanja: str | None) -> dict[str, str | None]:
    if not hanja:
        return {"hanja": None, "hangul": None}
    if len(hanja) != 2:
        return {"hanja": hanja, "hangul": hanja}
    return {
        "hanja": hanja,
        "hangul": f"{STEM_HANGUL.get(hanja[0], hanja[0])}{BRANCH_HANGUL.get(hanja[1], hanja[1])}",
    }


def normalize_lunar_date(raw: dict[str, Any] | None) -> dict[str, Any] | None:
    if raw is None:
        return None

    if "year" in raw:
        return {
            "year": raw["year"],
            "month": raw["month"],
            "day": raw["day"],
            "is_leap_month": bool(raw.get("isLeapMonth", False)),
        }

    return {
        "year": raw["lunar_year"],
        "month": raw["lunar_month"],
        "day": raw["lunar_day"],
        "is_leap_month": bool(raw.get("is_leap_month", False)),
    }


def result_payload(
    *,
    engine: str,
    supported: bool,
    warnings: list[str],
    error: str | None,
    birth_solar_date: str | None,
    birth_lunar_date: dict[str, Any] | None,
    effective_solar_datetime: str | None,
    correction_minutes: float | None,
    pillars: dict[str, dict[str, str | None]],
    solar_term: dict[str, Any] | None,
    raw: dict[str, Any] | None,
) -> dict[str, Any]:
    return {
        "engine": engine,
        "supported": supported,
        "warnings": warnings,
        "error": error,
        "birth_solar_date": birth_solar_date,
        "birth_lunar_date": birth_lunar_date,
        "effective_solar_datetime": effective_solar_datetime,
        "correction_minutes": correction_minutes,
        "pillars": pillars,
        "solar_term": solar_term,
        "raw": raw,
    }

