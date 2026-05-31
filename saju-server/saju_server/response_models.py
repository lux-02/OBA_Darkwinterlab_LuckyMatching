from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

from saju_server.models import CalculationRequest


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PillarPayloadResponse(StrictModel):
    hanja: str | None
    hangul: str | None


class PillarsResponse(StrictModel):
    year: PillarPayloadResponse
    month: PillarPayloadResponse
    day: PillarPayloadResponse
    hour: PillarPayloadResponse


class BirthLunarDateResponse(StrictModel):
    year: int
    month: int
    day: int
    is_leap_month: bool


class FourPillarStringResponse(StrictModel):
    year: str
    month: str
    day: str
    hour: str


class FourPillarStringListResponse(StrictModel):
    year: list[str]
    month: list[str]
    day: list[str]
    hour: list[str]


class HiddenStemItemResponse(StrictModel):
    stem: PillarPayloadResponse
    ten_god: str
    phase: str
    weight_ratio: int


class FourPillarHiddenStemsResponse(StrictModel):
    year: list[HiddenStemItemResponse]
    month: list[HiddenStemItemResponse]
    day: list[HiddenStemItemResponse]
    hour: list[HiddenStemItemResponse]


class TwelveFortunesResponse(StrictModel):
    by_day_master: FourPillarStringResponse
    by_pillar_stem: FourPillarStringResponse


class GongmangItemResponse(StrictModel):
    branch: PillarPayloadResponse
    ten_god: str


class TenGodsResponse(StrictModel):
    stems: FourPillarStringResponse
    branches: FourPillarStringResponse


class NatalDerivedResponse(StrictModel):
    ten_gods: TenGodsResponse
    hidden_stems: FourPillarHiddenStemsResponse
    twelve_fortunes: TwelveFortunesResponse
    twelve_sinsal: FourPillarStringResponse
    gongmang: list[GongmangItemResponse]
    special_stars: FourPillarStringListResponse


class DistributionRawResponse(StrictModel):
    self: float
    output: float
    wealth: float
    power: float
    resource: float


class DistributionDisplayResponse(StrictModel):
    self: int
    output: int
    wealth: int
    power: int
    resource: int


class ElementDistributionResponse(StrictModel):
    목: float
    화: float
    토: float
    금: float
    수: float


class DistributionAxisResponse(StrictModel):
    key: Literal["self", "output", "wealth", "power", "resource"]
    element: Literal["목", "화", "토", "금", "수"]
    ten_god_group: str
    label: str
    raw: float
    display: int


class DistributionResponse(StrictModel):
    raw: DistributionRawResponse
    display: DistributionDisplayResponse
    elements: ElementDistributionResponse
    axes: list[DistributionAxisResponse]


class FortunePillarResponse(StrictModel):
    hanja: str
    hangul: str


class FortuneTwelveResponse(StrictModel):
    by_day_master: str
    by_pillar_stem: str


class DaeunPeriodResponse(StrictModel):
    display_age: int
    pillar: FortunePillarResponse
    stem_ten_god: str
    branch_ten_god: str
    twelve_fortune: FortuneTwelveResponse
    start_year: int
    end_year: int


class DaeunResponse(StrictModel):
    start_age: int
    direction: Literal["forward", "backward"]
    periods: list[DaeunPeriodResponse]


class SeunYearResponse(StrictModel):
    year: int
    display_age: int
    pillar: FortunePillarResponse
    stem_ten_god: str
    branch_ten_god: str
    twelve_fortune: FortuneTwelveResponse


class SeunResponse(StrictModel):
    years: list[SeunYearResponse]


class WolunMonthResponse(StrictModel):
    month: int
    pillar: FortunePillarResponse
    stem_ten_god: str
    branch_ten_god: str
    twelve_fortune: FortuneTwelveResponse


class WolunResponse(StrictModel):
    year: int
    months: list[WolunMonthResponse]


class FortunesResponse(StrictModel):
    reference_year: int
    daeun: DaeunResponse | None
    seun: SeunResponse
    wolun: WolunResponse


class DerivedResponse(StrictModel):
    natal: NatalDerivedResponse
    distribution: DistributionResponse
    fortunes: FortunesResponse


class EngineResultResponse(StrictModel):
    engine: str
    supported: bool
    warnings: list[str]
    error: str | None
    birth_solar_date: str | None
    birth_lunar_date: BirthLunarDateResponse | None
    effective_solar_datetime: str | None
    correction_minutes: float | None
    pillars: PillarsResponse
    solar_term: dict[str, Any] | None
    raw: dict[str, Any] | None


class AuthoritativeResultResponse(EngineResultResponse):
    derived: DerivedResponse


class ValidationMismatchResponse(StrictModel):
    field: str
    service: str | None
    validator: str | None


class ValidationResponse(StrictModel):
    matches: bool
    mismatches: list[ValidationMismatchResponse]


class EnginesResponse(StrictModel):
    service: EngineResultResponse
    validator: EngineResultResponse


class SajuResponse(StrictModel):
    request: CalculationRequest
    resolution: Literal["service_engine", "validator_fallback", "service_only"]
    authoritative_engine: Literal["manseryeok", "sajupy"]
    authoritative_result: AuthoritativeResultResponse
    validation: ValidationResponse
    engines: EnginesResponse
