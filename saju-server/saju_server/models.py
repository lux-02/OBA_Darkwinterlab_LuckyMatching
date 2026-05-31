from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator


class CalculationRequest(BaseModel):
    calendar_type: Literal["solar", "lunar"] = "solar"
    year: int = Field(ge=1900, le=2050)
    month: int = Field(ge=1, le=12)
    day: int = Field(ge=1, le=31)
    hour: int = Field(ge=0, le=23)
    minute: int = Field(default=0, ge=0, le=59)
    is_leap_month: bool = False
    longitude: float | None = None
    utc_offset: float = 9.0
    use_solar_time: bool = True
    early_zi_time: bool = True
    # 출생 시간(시주)을 모를 때 false. summary 해석(오행분포·강약·용신)을
    # 연·월·일 삼주(三柱)만으로 계산해, 임의의 시주가 결과를 왜곡하지 않게 한다.
    time_known: bool = True
    gender: Literal["male", "female"] | None = None
    fortune_reference_year: int | None = Field(default=None, ge=1900, le=2100)
    fortune_years_before: int = Field(default=6, ge=0, le=20)
    fortune_years_after: int = Field(default=6, ge=0, le=20)

    @model_validator(mode="after")
    def validate_calendar_specific_fields(self) -> "CalculationRequest":
        if self.calendar_type == "solar" and self.is_leap_month:
            raise ValueError("is_leap_month can only be true for lunar input")
        return self
