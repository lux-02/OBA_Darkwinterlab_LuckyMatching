from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any

from sajupy import calculate_saju, lunar_to_solar, solar_to_lunar

from saju_server.bridge import ManseryeokBridge, ManseryeokBridgeError
from saju_server.models import CalculationRequest
from saju_server.utils import DEFAULT_LONGITUDE, iso_date, normalize_lunar_date, pillar_to_payload, result_payload, to_effective_datetime


@dataclass(slots=True)
class EngineResult:
    engine: str
    supported: bool
    warnings: list[str] = field(default_factory=list)
    error: str | None = None
    birth_solar_date: str | None = None
    birth_lunar_date: dict[str, Any] | None = None
    effective_solar_datetime: str | None = None
    correction_minutes: float | None = None
    pillars: dict[str, dict[str, str | None]] = field(default_factory=dict)
    solar_term: dict[str, Any] | None = None
    raw: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        return result_payload(
            engine=self.engine,
            supported=self.supported,
            warnings=self.warnings,
            error=self.error,
            birth_solar_date=self.birth_solar_date,
            birth_lunar_date=self.birth_lunar_date,
            effective_solar_datetime=self.effective_solar_datetime,
            correction_minutes=self.correction_minutes,
            pillars=self.pillars,
            solar_term=self.solar_term,
            raw=self.raw,
        )


class ManseryeokServiceEngine:
    def __init__(self, bridge: ManseryeokBridge | None = None) -> None:
        self.bridge = bridge or ManseryeokBridge()

    def calculate(self, request: CalculationRequest) -> EngineResult:
        warnings: list[str] = []
        resolved_longitude = request.longitude

        if request.use_solar_time and resolved_longitude is None:
            resolved_longitude = DEFAULT_LONGITUDE
            warnings.append("longitude omitted; defaulted to Seoul longitude 126.9780")

        try:
            birth_solar = self._resolve_birth_solar_date(request)
        except ManseryeokBridgeError as exc:
            return EngineResult(
                engine="manseryeok",
                supported=False,
                warnings=warnings,
                error=f"calendar conversion failed: {exc}",
            )

        corrected_datetime, correction_minutes = to_effective_datetime(
            birth_solar,
            request.hour,
            request.minute,
            use_solar_time=request.use_solar_time,
            longitude=resolved_longitude,
            utc_offset=request.utc_offset,
        )

        if request.early_zi_time and corrected_datetime.hour in (23, 0):
            warnings.append("early/late Zi split is not modeled in manseryeok; validator may override midnight cases")

        solar_term = None
        try:
            solar_term = self.bridge.get_solar_term_for_date(
                year=corrected_datetime.year,
                month=corrected_datetime.month,
                day=corrected_datetime.day,
            )
        except ManseryeokBridgeError as exc:
            warnings.append(f"solar term lookup unavailable: {exc}")

        if solar_term and solar_term.get("type") == "jeolgi":
            warnings.append("exact solar-term transition day detected; validator comparison is required")

        try:
            raw = self.bridge.calculate_saju(
                year=corrected_datetime.year,
                month=corrected_datetime.month,
                day=corrected_datetime.day,
                hour=corrected_datetime.hour,
                minute=corrected_datetime.minute,
                longitude=resolved_longitude,
                apply_time_correction=False,
            )
        except ManseryeokBridgeError as exc:
            return EngineResult(
                engine="manseryeok",
                supported=False,
                warnings=warnings,
                error=f"calculation failed: {exc}",
                birth_solar_date=iso_date(birth_solar.year, birth_solar.month, birth_solar.day),
                effective_solar_datetime=corrected_datetime.isoformat(timespec="minutes"),
                correction_minutes=correction_minutes,
            )

        birth_lunar_date = None
        try:
            lunar_raw = self.bridge.solar_to_lunar(year=birth_solar.year, month=birth_solar.month, day=birth_solar.day)
            birth_lunar_date = normalize_lunar_date(lunar_raw.get("lunar"))
        except ManseryeokBridgeError as exc:
            warnings.append(f"solar to lunar conversion unavailable: {exc}")

        pillars = {
            "year": pillar_to_payload(raw.get("yearPillarHanja")),
            "month": pillar_to_payload(raw.get("monthPillarHanja")),
            "day": pillar_to_payload(raw.get("dayPillarHanja")),
            "hour": pillar_to_payload(raw.get("hourPillarHanja")),
        }

        return EngineResult(
            engine="manseryeok",
            supported=True,
            warnings=warnings,
            birth_solar_date=iso_date(birth_solar.year, birth_solar.month, birth_solar.day),
            birth_lunar_date=birth_lunar_date,
            effective_solar_datetime=corrected_datetime.isoformat(timespec="minutes"),
            correction_minutes=correction_minutes,
            pillars=pillars,
            solar_term=solar_term,
            raw=raw,
        )

    def _resolve_birth_solar_date(self, request: CalculationRequest) -> date:
        if request.calendar_type == "solar":
            return date(request.year, request.month, request.day)

        converted = self.bridge.lunar_to_solar(
            year=request.year,
            month=request.month,
            day=request.day,
            is_leap_month=request.is_leap_month,
        )
        solar = converted["solar"]
        return date(solar["year"], solar["month"], solar["day"])


class SajupyValidationEngine:
    def calculate(self, request: CalculationRequest) -> EngineResult:
        warnings: list[str] = []
        resolved_longitude = request.longitude

        if request.use_solar_time and resolved_longitude is None:
            resolved_longitude = DEFAULT_LONGITUDE
            warnings.append("longitude omitted; defaulted to Seoul longitude 126.9780")

        try:
            birth_solar, birth_lunar = self._resolve_dates(request)
            raw = calculate_saju(
                year=birth_solar.year,
                month=birth_solar.month,
                day=birth_solar.day,
                hour=request.hour,
                minute=request.minute,
                longitude=resolved_longitude if request.use_solar_time else None,
                use_solar_time=request.use_solar_time,
                utc_offset=request.utc_offset,
                early_zi_time=request.early_zi_time,
            )
        except Exception as exc:  # noqa: BLE001
            return EngineResult(
                engine="sajupy",
                supported=False,
                warnings=warnings,
                error=f"validation calculation failed: {exc}",
            )

        corrected_datetime, correction_minutes = to_effective_datetime(
            birth_solar,
            request.hour,
            request.minute,
            use_solar_time=request.use_solar_time,
            longitude=resolved_longitude,
            utc_offset=request.utc_offset,
        )

        pillars = {
            "year": pillar_to_payload(raw.get("year_pillar")),
            "month": pillar_to_payload(raw.get("month_pillar")),
            "day": pillar_to_payload(raw.get("day_pillar")),
            "hour": pillar_to_payload(raw.get("hour_pillar")),
        }

        return EngineResult(
            engine="sajupy",
            supported=True,
            warnings=warnings,
            birth_solar_date=iso_date(birth_solar.year, birth_solar.month, birth_solar.day),
            birth_lunar_date=birth_lunar,
            effective_solar_datetime=corrected_datetime.isoformat(timespec="minutes"),
            correction_minutes=correction_minutes,
            pillars=pillars,
            raw=raw,
        )

    def _resolve_dates(self, request: CalculationRequest) -> tuple[date, dict[str, Any] | None]:
        if request.calendar_type == "lunar":
            converted = lunar_to_solar(request.year, request.month, request.day, request.is_leap_month)
            birth_solar = date(converted["solar_year"], converted["solar_month"], converted["solar_day"])
            birth_lunar = {
                "year": request.year,
                "month": request.month,
                "day": request.day,
                "is_leap_month": request.is_leap_month,
            }
            return birth_solar, birth_lunar

        birth_solar = date(request.year, request.month, request.day)
        birth_lunar = normalize_lunar_date(solar_to_lunar(request.year, request.month, request.day))
        return birth_solar, birth_lunar

