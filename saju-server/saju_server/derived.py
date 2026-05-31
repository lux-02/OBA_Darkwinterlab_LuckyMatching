from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from math import floor
from typing import Any
from zoneinfo import ZoneInfo

from sajupy import get_saju_calculator

from saju_server.models import CalculationRequest
from saju_server.utils import BRANCH_HANGUL, STEM_HANGUL

STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
SEXAGENARY = [f"{STEMS[index % 10]}{BRANCHES[index % 12]}" for index in range(60)]
SEOUL_TZ = ZoneInfo("Asia/Seoul")
JIE_TERMS = {"立春", "驚蟄", "淸明", "立夏", "芒種", "小暑", "立秋", "白露", "寒露", "立冬", "大雪", "小寒"}
PILLAR_KEYS = ("year", "month", "day", "hour")
# 출생 시간 미상일 때 오행분포·강약·용신을 연·월·일 삼주(三柱)로만 계산.
THREE_PILLAR_KEYS = ("year", "month", "day")
POSITION_WEIGHTS = {
    "year_stem": 5,
    "month_stem": 15,
    "day_stem": 0,
    "hour_stem": 10,
    "year_branch": 10,
    "month_branch": 30,
    "day_branch": 20,
    "hour_branch": 10,
}
TWO_PHASE_WEIGHTS = {"여기": 33, "정기": 67}
THREE_PHASE_WEIGHTS = {"여기": 30, "중기": 10, "정기": 60}
TWELVE_FORTUNES = ["장생", "목욕", "관대", "건록", "제왕", "쇠", "병", "사", "묘", "절", "태", "양"]
TWELVE_SINSAL = ["장성", "반안", "역마", "육해", "화개", "겁살", "재살", "천살", "지살", "도화", "월살", "망신"]
GUEGANG_PILLARS = {"庚辰", "庚戌", "壬辰", "壬戌", "戊辰", "戊戌"}

WUXING_GENERATION = {"목": "화", "화": "토", "토": "금", "금": "수", "수": "목"}
WUXING_DESTRUCTION = {"목": "토", "화": "금", "토": "수", "금": "목", "수": "화"}
SELF_TO_GROUP = {
    "self": "비겁",
    "output": "식상",
    "wealth": "재성",
    "power": "관성",
    "resource": "인성",
}
MALE_FAMILY_LABELS = {
    "self": "형제",
    "output": "장모",
    "wealth": "아내",
    "power": "자녀",
    "resource": "모친",
}
GENERIC_FAMILY_LABELS = {
    "self": "형제",
    "output": "표현",
    "wealth": "재물",
    "power": "관계",
    "resource": "보호",
}
TWELVE_FORTUNE_START = {
    "甲": "亥",
    "乙": "午",
    "丙": "寅",
    "丁": "酉",
    "戊": "寅",
    "己": "酉",
    "庚": "巳",
    "辛": "子",
    "壬": "申",
    "癸": "卯",
}
YEAR_STEM_TO_FIRST_MONTH_STEM = {
    "甲": "丙",
    "乙": "戊",
    "丙": "庚",
    "丁": "壬",
    "戊": "甲",
    "己": "丙",
    "庚": "戊",
    "辛": "庚",
    "壬": "壬",
    "癸": "甲",
}
GREGORIAN_MONTH_BRANCHES = {
    1: "丑",
    2: "寅",
    3: "卯",
    4: "辰",
    5: "巳",
    6: "午",
    7: "未",
    8: "申",
    9: "酉",
    10: "戌",
    11: "亥",
    12: "子",
}
THREE_HARMONY_ANCHORS = {
    frozenset({"申", "子", "辰"}): "子",
    frozenset({"亥", "卯", "未"}): "卯",
    frozenset({"寅", "午", "戌"}): "午",
    frozenset({"巳", "酉", "丑"}): "酉",
}


@dataclass(frozen=True)
class StemInfo:
    hanja: str
    hangul: str
    element: str
    yin_yang: str


@dataclass(frozen=True)
class BranchInfo:
    hanja: str
    hangul: str
    element: str
    yin_yang: str


STEM_INFO = {
    "甲": StemInfo("甲", "갑", "목", "양"),
    "乙": StemInfo("乙", "을", "목", "음"),
    "丙": StemInfo("丙", "병", "화", "양"),
    "丁": StemInfo("丁", "정", "화", "음"),
    "戊": StemInfo("戊", "무", "토", "양"),
    "己": StemInfo("己", "기", "토", "음"),
    "庚": StemInfo("庚", "경", "금", "양"),
    "辛": StemInfo("辛", "신", "금", "음"),
    "壬": StemInfo("壬", "임", "수", "양"),
    "癸": StemInfo("癸", "계", "수", "음"),
}
BRANCH_INFO = {
    "子": BranchInfo("子", "자", "수", "양"),
    "丑": BranchInfo("丑", "축", "토", "음"),
    "寅": BranchInfo("寅", "인", "목", "양"),
    "卯": BranchInfo("卯", "묘", "목", "음"),
    "辰": BranchInfo("辰", "진", "토", "양"),
    "巳": BranchInfo("巳", "사", "화", "음"),
    "午": BranchInfo("午", "오", "화", "양"),
    "未": BranchInfo("未", "미", "토", "음"),
    "申": BranchInfo("申", "신", "금", "양"),
    "酉": BranchInfo("酉", "유", "금", "음"),
    "戌": BranchInfo("戌", "술", "토", "양"),
    "亥": BranchInfo("亥", "해", "수", "음"),
}

BRANCH_PHASES = {
    "子": [("壬", "여기"), ("癸", "정기")],
    "丑": [("癸", "여기"), ("辛", "중기"), ("己", "정기")],
    "寅": [("戊", "여기"), ("丙", "중기"), ("甲", "정기")],
    "卯": [("甲", "여기"), ("乙", "정기")],
    "辰": [("乙", "여기"), ("癸", "중기"), ("戊", "정기")],
    "巳": [("戊", "여기"), ("庚", "중기"), ("丙", "정기")],
    "午": [("丙", "여기"), ("己", "중기"), ("丁", "정기")],
    "未": [("丁", "여기"), ("乙", "중기"), ("己", "정기")],
    "申": [("戊", "여기"), ("壬", "중기"), ("庚", "정기")],
    "酉": [("庚", "여기"), ("辛", "정기")],
    "戌": [("辛", "여기"), ("丁", "중기"), ("戊", "정기")],
    "亥": [("甲", "중기"), ("壬", "정기")],
}
BRANCH_PHASE_WEIGHTS = {
    "子": {"여기": 33, "정기": 67},
    "丑": {"여기": 29, "중기": 10, "정기": 61},
    "寅": {"여기": 23, "중기": 23, "정기": 54},
    "卯": {"여기": 33, "정기": 67},
    "辰": {"여기": 30, "중기": 10, "정기": 60},
    "巳": {"여기": 23, "중기": 29, "정기": 48},
    "午": {"여기": 33, "중기": 33, "정기": 34},
    "未": {"여기": 29, "중기": 10, "정기": 61},
    "申": {"여기": 23, "중기": 23, "정기": 54},
    "酉": {"여기": 33, "정기": 67},
    "戌": {"여기": 29, "중기": 10, "정기": 61},
    "亥": {"중기": 29, "정기": 71},
}


def build_derived_payload(request: CalculationRequest, authoritative_result: dict[str, Any]) -> dict[str, Any]:
    pillars = {
        key: split_pillar(authoritative_result["pillars"][key]["hanja"])
        for key in PILLAR_KEYS
    }
    effective_dt = resolve_effective_datetime(request, authoritative_result)
    birth_year = int(authoritative_result["birth_solar_date"][:4])
    natal = build_natal_section(pillars)
    distribution = build_distribution_section(
        pillars=pillars,
        gender=request.gender,
    )
    fortunes = build_fortunes_section(
        request=request,
        pillars=pillars,
        birth_year=birth_year,
        effective_dt=effective_dt,
    )

    return {
        "natal": natal,
        "distribution": distribution,
        "fortunes": fortunes,
    }


def resolve_effective_datetime(request: CalculationRequest, authoritative_result: dict[str, Any]) -> datetime:
    effective = authoritative_result.get("effective_solar_datetime")
    if effective:
        return datetime.fromisoformat(effective)
    return datetime(request.year, request.month, request.day, request.hour, request.minute)


def split_pillar(hanja_pillar: str) -> tuple[str, str]:
    return hanja_pillar[0], hanja_pillar[1]


def stem_payload(hanja: str) -> dict[str, str]:
    return {"hanja": hanja, "hangul": STEM_HANGUL[hanja]}


def branch_payload(hanja: str) -> dict[str, str]:
    return {"hanja": hanja, "hangul": BRANCH_HANGUL[hanja]}


def build_natal_section(pillars: dict[str, tuple[str, str]]) -> dict[str, Any]:
    day_stem = pillars["day"][0]
    day_branch = pillars["day"][1]

    ten_gods_stems = {
        "year": ten_god(day_stem, pillars["year"][0]),
        "month": ten_god(day_stem, pillars["month"][0]),
        "day": "일간",
        "hour": ten_god(day_stem, pillars["hour"][0]),
    }
    ten_gods_branches = {
        key: ten_god(day_stem, branch_main_stem(pillars[key][1]))
        for key in PILLAR_KEYS
    }

    hidden_stems = {
        key: [
            {
                "stem": stem_payload(stem),
                "ten_god": ten_god(day_stem, stem),
                "phase": phase,
                "weight_ratio": branch_phase_weight(pillars[key][1], phase),
            }
            for stem, phase in BRANCH_PHASES[pillars[key][1]]
        ]
        for key in PILLAR_KEYS
    }

    twelve_fortunes_by_day_master = {
        key: twelve_fortune(day_stem, pillars[key][1])
        for key in PILLAR_KEYS
    }
    twelve_fortunes_by_pillar_stem = {
        key: twelve_fortune(pillars[key][0], pillars[key][1])
        for key in PILLAR_KEYS
    }

    return {
        "ten_gods": {
            "stems": ten_gods_stems,
            "branches": ten_gods_branches,
        },
        "hidden_stems": hidden_stems,
        "twelve_fortunes": {
            "by_day_master": twelve_fortunes_by_day_master,
            "by_pillar_stem": twelve_fortunes_by_pillar_stem,
        },
        "twelve_sinsal": {
            key: twelve_sinsal(day_branch, pillars[key][1])
            for key in PILLAR_KEYS
        },
        "gongmang": gongmang(day_stem, f"{pillars['day'][0]}{pillars['day'][1]}"),
        "special_stars": {
            key: special_stars(f"{pillars[key][0]}{pillars[key][1]}")
            for key in PILLAR_KEYS
        },
    }


def build_distribution_section(
    pillars: dict[str, tuple[str, str]],
    gender: str | None,
    pillar_keys: tuple[str, ...] = PILLAR_KEYS,
) -> dict[str, Any]:
    """오행/십성 분포. pillar_keys로 집계 대상 기둥을 제한할 수 있다.

    기본은 4주(연·월·일·시). 출생 시간 미상이면 THREE_PILLAR_KEYS(연·월·일)를
    넘겨 임의의 시주가 분포·강약·용신을 흔들지 않게 한다.
    """
    day_stem = pillars["day"][0]
    categories = {"self": 0.0, "output": 0.0, "wealth": 0.0, "power": 0.0, "resource": 0.0}
    elements = {"목": 0.0, "화": 0.0, "토": 0.0, "금": 0.0, "수": 0.0}

    for key in pillar_keys:
        stem_weight = POSITION_WEIGHTS[f"{key}_stem"]
        stem = pillars[key][0]
        if stem_weight:
            group = ten_god_group(day_stem, stem)
            categories[group] += stem_weight
            elements[STEM_INFO[stem].element] += stem_weight

        branch_weight = POSITION_WEIGHTS[f"{key}_branch"]
        branch = pillars[key][1]
        for hidden_stem, phase in BRANCH_PHASES[branch]:
            ratio = branch_phase_weight(branch, phase)
            weighted_value = branch_weight * (ratio / 100)
            group = ten_god_group(day_stem, hidden_stem)
            categories[group] += weighted_value
            elements[STEM_INFO[hidden_stem].element] += weighted_value

    display = {
        key: int(floor(value / 10) * 10)
        for key, value in categories.items()
    }

    axes = []
    labels = MALE_FAMILY_LABELS if gender == "male" else GENERIC_FAMILY_LABELS
    for key, element in relation_elements(day_stem).items():
        axes.append(
            {
                "key": key,
                "element": element,
                "ten_god_group": SELF_TO_GROUP[key],
                "label": f"{element}-{SELF_TO_GROUP[key]}/{labels[key]}",
                "raw": round(categories[key], 1),
                "display": display[key],
            }
        )

    return {
        "raw": {key: round(value, 1) for key, value in categories.items()},
        "display": display,
        "elements": {key: round(value, 1) for key, value in elements.items()},
        "axes": axes,
    }


def build_fortunes_section(
    request: CalculationRequest,
    pillars: dict[str, tuple[str, str]],
    birth_year: int,
    effective_dt: datetime,
) -> dict[str, Any]:
    reference_year = request.fortune_reference_year or datetime.now(SEOUL_TZ).year
    seun_years = []
    for year in range(reference_year - request.fortune_years_before, reference_year + request.fortune_years_after + 1):
        seun_years.append(build_year_fortune(pillars, birth_year, year))

    daeun_payload: dict[str, Any] | None = None
    if request.gender is not None:
        daeun_payload = build_daeun_section(
            pillars=pillars,
            effective_dt=effective_dt,
            birth_year=birth_year,
            gender=request.gender,
        )

    wolun_months = [build_month_fortune(pillars, reference_year, month) for month in range(1, 13)]

    return {
        "reference_year": reference_year,
        "daeun": daeun_payload,
        "seun": {"years": seun_years},
        "wolun": {"year": reference_year, "months": wolun_months},
    }


def build_daeun_section(
    pillars: dict[str, tuple[str, str]],
    effective_dt: datetime,
    birth_year: int,
    gender: str,
) -> dict[str, Any]:
    year_stem = pillars["year"][0]
    month_stem = pillars["month"][0]
    month_branch = pillars["month"][1]
    day_stem = pillars["day"][0]

    forward = is_daeun_forward(year_stem, gender)
    target_term = find_adjacent_jie_term(effective_dt, forward)
    if target_term is None:
        start_age = 5
    else:
        seconds = abs((target_term - effective_dt).total_seconds())
        start_age = max(0, min(10, int(seconds / 86400 // 3)))

    periods = []
    for index in range(10):
        stem_index = STEMS.index(month_stem)
        branch_index = BRANCHES.index(month_branch)
        offset = index + 1
        if forward:
            period_stem = STEMS[(stem_index + offset) % 10]
            period_branch = BRANCHES[(branch_index + offset) % 12]
        else:
            period_stem = STEMS[(stem_index - offset) % 10]
            period_branch = BRANCHES[(branch_index - offset) % 12]

        periods.append(
            {
                "display_age": start_age + (index * 10),
                "pillar": {
                    "hanja": f"{period_stem}{period_branch}",
                    "hangul": f"{STEM_HANGUL[period_stem]}{BRANCH_HANGUL[period_branch]}",
                },
                "stem_ten_god": ten_god(day_stem, period_stem),
                "branch_ten_god": ten_god(day_stem, branch_main_stem(period_branch)),
                "twelve_fortune": {
                    "by_day_master": twelve_fortune(day_stem, period_branch),
                    "by_pillar_stem": twelve_fortune(period_stem, period_branch),
                },
                "start_year": birth_year + start_age + (index * 10),
                "end_year": birth_year + start_age + ((index + 1) * 10) - 1,
            }
        )

    return {
        "start_age": start_age,
        "direction": "forward" if forward else "backward",
        "periods": periods,
    }


def build_year_fortune(pillars: dict[str, tuple[str, str]], birth_year: int, target_year: int) -> dict[str, Any]:
    day_stem = pillars["day"][0]
    stem, branch = year_pillar_from_year(target_year)
    return {
        "year": target_year,
        "display_age": target_year - birth_year,
        "pillar": {
            "hanja": f"{stem}{branch}",
            "hangul": f"{STEM_HANGUL[stem]}{BRANCH_HANGUL[branch]}",
        },
        "stem_ten_god": ten_god(day_stem, stem),
        "branch_ten_god": ten_god(day_stem, branch_main_stem(branch)),
        "twelve_fortune": {
            "by_day_master": twelve_fortune(day_stem, branch),
            "by_pillar_stem": twelve_fortune(stem, branch),
        },
    }


def build_month_fortune(pillars: dict[str, tuple[str, str]], target_year: int, target_month: int) -> dict[str, Any]:
    day_stem = pillars["day"][0]
    year_stem, _ = year_pillar_from_year(target_year)
    branch = GREGORIAN_MONTH_BRANCHES[target_month]
    stem = month_stem_from_year_stem(year_stem, branch)
    return {
        "month": target_month,
        "pillar": {
            "hanja": f"{stem}{branch}",
            "hangul": f"{STEM_HANGUL[stem]}{BRANCH_HANGUL[branch]}",
        },
        "stem_ten_god": ten_god(day_stem, stem),
        "branch_ten_god": ten_god(day_stem, branch_main_stem(branch)),
        "twelve_fortune": {
            "by_day_master": twelve_fortune(day_stem, branch),
            "by_pillar_stem": twelve_fortune(stem, branch),
        },
    }


def relation_elements(day_stem: str) -> dict[str, str]:
    element = STEM_INFO[day_stem].element
    generation_target = WUXING_GENERATION[element]
    wealth_target = WUXING_DESTRUCTION[element]
    power_target = next(key for key, value in WUXING_DESTRUCTION.items() if value == element)
    resource_target = next(key for key, value in WUXING_GENERATION.items() if value == element)
    return {
        "self": element,
        "output": generation_target,
        "wealth": wealth_target,
        "power": power_target,
        "resource": resource_target,
    }


def element_to_branch(element: str) -> str:
    mapping = {"수": "子", "목": "寅", "화": "午", "토": "辰", "금": "申"}
    return mapping[element]


def ten_god(day_stem: str, target_stem: str) -> str:
    day_info = STEM_INFO[day_stem]
    target_info = STEM_INFO[target_stem]

    if day_info.element == target_info.element:
        return "비견" if day_info.yin_yang == target_info.yin_yang else "겁재"
    if WUXING_GENERATION[day_info.element] == target_info.element:
        return "식신" if day_info.yin_yang == target_info.yin_yang else "상관"
    if WUXING_DESTRUCTION[day_info.element] == target_info.element:
        return "편재" if day_info.yin_yang == target_info.yin_yang else "정재"
    if WUXING_DESTRUCTION[target_info.element] == day_info.element:
        return "편관" if day_info.yin_yang == target_info.yin_yang else "정관"
    if WUXING_GENERATION[target_info.element] == day_info.element:
        return "편인" if day_info.yin_yang == target_info.yin_yang else "정인"
    raise ValueError(f"unable to resolve ten god for {day_stem} -> {target_stem}")


def ten_god_group(day_stem: str, target_stem: str) -> str:
    group = ten_god(day_stem, target_stem)
    if group in {"비견", "겁재"}:
        return "self"
    if group in {"식신", "상관"}:
        return "output"
    if group in {"편재", "정재"}:
        return "wealth"
    if group in {"편관", "정관"}:
        return "power"
    return "resource"


def branch_main_stem(branch: str) -> str:
    return BRANCH_PHASES[branch][-1][0]


def branch_phase_weight(branch: str, phase: str) -> int:
    return BRANCH_PHASE_WEIGHTS[branch][phase]


def twelve_fortune(stem: str, branch: str) -> str:
    start_branch = TWELVE_FORTUNE_START[stem]
    start_index = BRANCHES.index(start_branch)
    branch_index = BRANCHES.index(branch)
    if STEM_INFO[stem].yin_yang == "양":
        offset = (branch_index - start_index) % 12
    else:
        offset = (start_index - branch_index) % 12
    return TWELVE_FORTUNES[offset]


def twelve_sinsal(day_branch: str, target_branch: str) -> str:
    day_group = next(anchor for group, anchor in THREE_HARMONY_ANCHORS.items() if day_branch in group)
    offset = (BRANCHES.index(target_branch) - BRANCHES.index(day_group)) % 12
    return TWELVE_SINSAL[offset]


def gongmang(day_stem: str, day_pillar: str) -> list[dict[str, Any]]:
    day_index = SEXAGENARY.index(day_pillar)
    xun_start_index = (day_index // 10) * 10
    xun_branch = SEXAGENARY[xun_start_index][1]
    xun_branch_index = BRANCHES.index(xun_branch)
    empty_branches = [BRANCHES[(xun_branch_index - 2) % 12], BRANCHES[(xun_branch_index - 1) % 12]]
    return [
        {
            "branch": branch_payload(branch),
            "ten_god": ten_god(day_stem, branch_main_stem(branch)),
        }
        for branch in empty_branches
    ]


def special_stars(pillar: str) -> list[str]:
    stars: list[str] = []
    if pillar in GUEGANG_PILLARS:
        stars.append("괴강살")
    return stars


def is_daeun_forward(year_stem: str, gender: str) -> bool:
    is_yang = STEM_INFO[year_stem].yin_yang == "양"
    return (is_yang and gender == "male") or ((not is_yang) and gender == "female")


def find_adjacent_jie_term(effective_dt: datetime, forward: bool) -> datetime | None:
    calculator = get_saju_calculator()
    data = calculator.data
    candidate_rows = data[
        data["year"].between(effective_dt.year - 1, effective_dt.year + 1)
        & data["solar_term_hanja"].isin(JIE_TERMS)
        & data["term_time"].notna()
    ]

    datetimes = []
    for value in candidate_rows["term_time"]:
        parsed = parse_term_time(value)
        if parsed is not None:
            datetimes.append(parsed)

    if forward:
        future_terms = [value for value in datetimes if value > effective_dt]
        return min(future_terms) if future_terms else None

    past_terms = [value for value in datetimes if value <= effective_dt]
    return max(past_terms) if past_terms else None


def parse_term_time(raw_value: Any) -> datetime | None:
    if raw_value is None:
        return None
    as_string = str(int(float(str(raw_value))))
    if len(as_string) != 12:
        return None
    return datetime(
        int(as_string[0:4]),
        int(as_string[4:6]),
        int(as_string[6:8]),
        int(as_string[8:10]),
        int(as_string[10:12]),
    )


def year_pillar_from_year(year: int) -> tuple[str, str]:
    offset = year - 1984
    return STEMS[offset % 10], BRANCHES[offset % 12]


def month_stem_from_year_stem(year_stem: str, month_branch: str) -> str:
    first_month_stem = YEAR_STEM_TO_FIRST_MONTH_STEM[year_stem]
    first_index = STEMS.index(first_month_stem)
    month_offset = (BRANCHES.index(month_branch) - BRANCHES.index("寅")) % 12
    return STEMS[(first_index + month_offset) % 10]
