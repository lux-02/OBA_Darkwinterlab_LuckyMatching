from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import quickjs

DEFAULT_BUNDLE_PATH = Path(__file__).resolve().parent / "vendor" / "manseryeok_bridge.bundle.js"


class ManseryeokBridgeError(RuntimeError):
    pass


class ManseryeokBridge:
    def __init__(self, bundle_path: Path | None = None) -> None:
        self.bundle_path = bundle_path or DEFAULT_BUNDLE_PATH
        self._bundle_source: str | None = None

    def is_ready(self) -> bool:
        return self.bundle_path.exists()

    def _load_bundle(self) -> str:
        if self._bundle_source is None:
            if not self.bundle_path.exists():
                raise ManseryeokBridgeError(
                    f"bundle missing at {self.bundle_path}; run `npm install && npm run build:bridge` first"
                )
            self._bundle_source = self.bundle_path.read_text(encoding="utf-8")
        return self._bundle_source

    def _new_context(self) -> quickjs.Context:
        context = quickjs.Context()
        context.eval(self._load_bundle())
        return context

    def _call(self, function_name: str, payload: dict[str, Any]) -> Any:
        try:
            encoded_payload = json.dumps(payload, ensure_ascii=False)
            expression = f"ManseryeokBridge.{function_name}({json.dumps(encoded_payload, ensure_ascii=False)})"
            response = self._new_context().eval(expression)
        except quickjs.JSException as exc:
            raise ManseryeokBridgeError(str(exc)) from exc

        return json.loads(response)

    def solar_to_lunar(self, *, year: int, month: int, day: int) -> dict[str, Any]:
        return self._call("solarToLunarFromJson", {"year": year, "month": month, "day": day})

    def lunar_to_solar(self, *, year: int, month: int, day: int, is_leap_month: bool) -> dict[str, Any]:
        return self._call(
            "lunarToSolarFromJson",
            {
                "year": year,
                "month": month,
                "day": day,
                "is_leap_month": is_leap_month,
            },
        )

    def calculate_saju(
        self,
        *,
        year: int,
        month: int,
        day: int,
        hour: int,
        minute: int,
        longitude: float | None = None,
        apply_time_correction: bool = False,
    ) -> dict[str, Any]:
        return self._call(
            "calculateSajuFromJson",
            {
                "year": year,
                "month": month,
                "day": day,
                "hour": hour,
                "minute": minute,
                "longitude": longitude,
                "apply_time_correction": apply_time_correction,
            },
        )

    def get_solar_term_for_date(self, *, year: int, month: int, day: int) -> dict[str, Any] | None:
        return self._call("getSolarTermForDateFromJson", {"year": year, "month": month, "day": day})

    def get_solar_terms_by_year(self, *, year: int) -> list[dict[str, Any]]:
        return self._call("getSolarTermsByYearFromJson", {"year": year})

