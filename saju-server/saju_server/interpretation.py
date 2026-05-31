"""사주 원시값을 여행 추천으로 잇는 해석 레이어.

- 신강/신약 판정 (억부 단순화): 기존 distribution.raw 재활용, 새 계산 없음.
- 용신/희신 후보: relation_elements() 재활용.
- 오방(五方) 매핑: 전통 방위-오행(동=목/남=화/중앙=토/서=금/북=수) +
  풍수 형기론 지형 속성 + 오방색. 정적 테이블로 동결(결정론적·즉시응답).

근거: 한국민족문화대백과사전 음양오행설, 풍수 형기론(오성체).
정밀 용신(조후/병약/통관)은 로드맵. 본 모듈은 억부 단순화 + 조후 보조.
"""

from __future__ import annotations

from saju_server.derived import STEM_INFO, relation_elements

ELEMENT_COLOR = {"목": "청", "화": "적", "토": "황", "금": "백", "수": "흑"}
ELEMENT_DIRECTION = {"목": "동", "화": "남", "토": "중앙", "금": "서", "수": "북"}

# 방위(한반도 내) + 풍수 형기론 지형 속성 + 마이리얼트립 상품 카테고리 키워드.
OBANG_REGIONS: dict[str, dict] = {
    "목": {
        "direction": "동",
        "color": "청",
        "terrain": "산·숲",
        "rationale": "동방 목(木) + 형기론 목성체(곧게 솟은 산). 상승·성장의 기운.",
        "regions": ["설악산·속초", "지리산 둘레길", "담양 죽녹원", "포천 국립수목원", "가평 잣향기 푸른숲"],
        "categories": ["트레킹", "숲치유", "캠핑", "수목원"],
    },
    "화": {
        "direction": "남",
        "color": "적",
        "terrain": "화산·온천",
        "rationale": "남방 화(火) + 화산/온천 지형. 확산·발산의 기운.",
        "regions": ["제주(화산·오름)", "부산 해운대·남해", "유성·온양 온천", "수안보·부곡 온천", "대구 근교"],
        "categories": ["온천·스파", "해변", "축제·야경", "맛집투어"],
    },
    "토": {
        "direction": "중앙",
        "color": "황",
        "terrain": "평야·분지·전통",
        "rationale": "중앙 토(土) + 평야/분지. 안정·중재의 기운.",
        "regions": ["안동 하회마을", "전주 한옥마을", "경주", "충청 내륙(공주·부여)", "김제·정읍 평야"],
        "categories": ["전통문화", "한옥스테이", "고궁·유적", "농촌체험"],
    },
    "금": {
        "direction": "서",
        "color": "백",
        "terrain": "도심·금속·바위",
        "rationale": "서방 금(金) + 형기론 금성체(둥근 바위산)·금속(도시). 결단·정제의 기운.",
        "regions": ["서울 도심", "인천 차이나타운", "북한산 바위능선", "서해안 일몰", "현대미술관·쇼핑"],
        "categories": ["미술관·전시", "쇼핑", "도심야경", "암벽·클라이밍"],
    },
    "수": {
        "direction": "북",
        "color": "흑",
        "terrain": "바다·강·계곡",
        "rationale": "북방 수(水) + 바다/강/계곡. 휴식·침잠의 기운.",
        "regions": ["강릉·동해안", "충주호·청평호", "남이섬", "한탄강 주상절리", "양양 서핑"],
        "categories": ["해양레저", "서핑", "호수카약", "워터파크"],
    },
}


def _dedup(elements: list[str]) -> list[str]:
    seen: list[str] = []
    for element in elements:
        if element not in seen:
            seen.append(element)
    return seen


def derive_strength(distribution_raw: dict[str, float], day_stem: str) -> dict:
    """억부 단순화: self(비겁)+resource(인성)=돕는 힘 vs 나머지=빼는 힘."""
    supporting = distribution_raw["self"] + distribution_raw["resource"]
    draining = distribution_raw["output"] + distribution_raw["wealth"] + distribution_raw["power"]
    total = supporting + draining
    ratio = supporting / total if total else 0.5

    relation = relation_elements(day_stem)  # {self,output,wealth,power,resource} -> 오행

    if ratio >= 0.55:
        strength, mode = "신강", "amplify"
        favorable = _dedup([relation["output"], relation["wealth"], relation["power"]])
        unfavorable = _dedup([relation["self"], relation["resource"]])
    elif ratio <= 0.45:
        strength, mode = "신약", "supplement"
        favorable = _dedup([relation["resource"], relation["self"]])
        unfavorable = _dedup([relation["output"], relation["wealth"], relation["power"]])
    else:
        strength, mode = "중화", "balance"
        favorable = []
        unfavorable = []

    return {
        "type": strength,
        "mode": mode,
        "support_ratio": round(ratio, 3),
        "day_master_element": STEM_INFO[day_stem].element,
        "favorable_elements": favorable,
        "unfavorable_elements": unfavorable,
    }


def build_interpretation(distribution: dict, day_stem: str) -> dict:
    """추천에 바로 쓰는 해석 블록: 강약 + 추천/회피 오행 + 오방 지역."""
    elements: dict[str, float] = distribution["elements"]
    strength = derive_strength(distribution["raw"], day_stem)

    sorted_elements = sorted(elements.items(), key=lambda item: item[1])
    deficient_element = sorted_elements[0][0]
    dominant_element = sorted_elements[-1][0]

    # 신강/신약이면 용신(favorable), 중화면 조후 보조로 가장 부족한 오행을 채움.
    if strength["mode"] == "balance":
        recommended_elements = [deficient_element]
        avoid_elements = [dominant_element]
    else:
        recommended_elements = strength["favorable_elements"]
        avoid_elements = strength["unfavorable_elements"]

    def regions_for(element_list: list[str]) -> list[dict]:
        return [{"element": element, **OBANG_REGIONS[element]} for element in element_list]

    return {
        "strength": strength,
        "dominant_element": dominant_element,
        "deficient_element": deficient_element,
        "element_color": {element: ELEMENT_COLOR[element] for element in elements},
        "recommended_elements": recommended_elements,
        "avoid_elements": avoid_elements,
        "recommended_regions": regions_for(recommended_elements),
        "avoid_regions": regions_for(avoid_elements),
    }


def score_daily(user_day_stem: str, today_stem: str, today_element: str,
                favorable_elements: list[str], unfavorable_elements: list[str]) -> dict:
    """오늘 일진 × 내 사주 상호작용 점수(0~100) + 한줄 카피."""
    from saju_server.derived import ten_god

    relation = ten_god(user_day_stem, today_stem)
    base = 50
    if today_element in favorable_elements:
        base += 30
        verdict = "좋음"
    elif today_element in unfavorable_elements:
        base -= 25
        verdict = "주의"
    else:
        verdict = "보통"

    region = OBANG_REGIONS[today_element]
    direction = ELEMENT_DIRECTION[today_element]
    if verdict == "주의":
        # 강한 기운 → 보완 오행(용신)으로 균형
        target = favorable_elements[0] if favorable_elements else today_element
        region = OBANG_REGIONS[target]
        headline = f"오늘은 {today_element} 기운이 강하게 들어와요. {target}({ELEMENT_DIRECTION[target]}) 쪽에서 한 박자 쉬어가요."
    elif verdict == "좋음":
        headline = f"오늘은 {today_element}({direction}) 기운이 잘 들어와요. {region['terrain']} 쪽이 좋아요."
    else:
        headline = f"{today_element}({direction}) 기운의 잔잔한 하루예요. {region['terrain']}도 좋아요."

    return {
        "score": max(0, min(100, base)),
        "verdict": verdict,
        "today_ten_god": relation,
        "today_element": today_element,
        "headline": headline,
        "region": region,
    }
