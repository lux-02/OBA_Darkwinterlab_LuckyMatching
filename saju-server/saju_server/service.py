from __future__ import annotations

from typing import Any

from saju_server.bridge import ManseryeokBridge
from saju_server.derived import build_derived_payload
from saju_server.engines import EngineResult, ManseryeokServiceEngine, SajupyValidationEngine
from saju_server.models import CalculationRequest


class ValidatedSajuService:
    def __init__(self) -> None:
        self.bridge = ManseryeokBridge()
        self.service_engine = ManseryeokServiceEngine(self.bridge)
        self.validator_engine = SajupyValidationEngine()

    def health(self) -> dict[str, Any]:
        return {
            "ok": True,
            "service_engine": "manseryeok",
            "validator_engine": "sajupy",
            "service_bundle_ready": self.bridge.is_ready(),
        }

    def calculate(self, request: CalculationRequest) -> dict[str, Any]:
        service_result = self.service_engine.calculate(request)
        validator_result = self.validator_engine.calculate(request)

        if not service_result.supported and not validator_result.supported:
            raise RuntimeError("both service and validator engines failed")

        mismatches = self._compare_results(service_result, validator_result, request.use_solar_time)

        if not validator_result.supported:
            authoritative = service_result
            resolution = "service_only"
        elif not service_result.supported or mismatches:
            authoritative = validator_result
            resolution = "validator_fallback"
        else:
            authoritative = service_result
            resolution = "service_engine"

        authoritative_payload = authoritative.to_dict()
        authoritative_payload["derived"] = build_derived_payload(request, authoritative_payload)

        return {
            "request": request.model_dump(),
            "resolution": resolution,
            "authoritative_engine": authoritative.engine,
            "authoritative_result": authoritative_payload,
            "validation": {
                "matches": len(mismatches) == 0 and service_result.supported and validator_result.supported,
                "mismatches": mismatches,
            },
            "engines": {
                "service": service_result.to_dict(),
                "validator": validator_result.to_dict(),
            },
        }

    def _compare_results(
        self,
        service_result: EngineResult,
        validator_result: EngineResult,
        compare_effective_datetime: bool,
    ) -> list[dict[str, Any]]:
        mismatches: list[dict[str, Any]] = []

        if not service_result.supported:
            mismatches.append(
                {
                    "field": "service_engine",
                    "service": service_result.error,
                    "validator": "supported",
                }
            )
            return mismatches

        if not validator_result.supported:
            mismatches.append(
                {
                    "field": "validator_engine",
                    "service": "supported",
                    "validator": validator_result.error,
                }
            )
            return mismatches

        for field_name in ("year", "month", "day", "hour"):
            service_value = service_result.pillars[field_name]["hanja"]
            validator_value = validator_result.pillars[field_name]["hanja"]
            if service_value != validator_value:
                mismatches.append(
                    {
                        "field": f"{field_name}_pillar",
                        "service": service_value,
                        "validator": validator_value,
                    }
                )

        if compare_effective_datetime and (
            service_result.effective_solar_datetime != validator_result.effective_solar_datetime
        ):
            mismatches.append(
                {
                    "field": "effective_solar_datetime",
                    "service": service_result.effective_solar_datetime,
                    "validator": validator_result.effective_solar_datetime,
                }
            )

        return mismatches
