"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import ElementRadarIllustrated from "@/components/ElementRadarIllustrated";
import RadialGauge from "@/components/RadialGauge";
import BalanceMeter from "@/components/BalanceMeter";
import ShareCard from "@/components/ShareCard";
import Analyzing from "@/components/Analyzing";
import ElementIcon from "@/components/ElementIcon";
import GguiChat from "@/components/GguiChat";
import { fetchSummary, fetchForecast } from "@/lib/saju";
import { becauseLine } from "@/lib/explain";
import { ELEMENT_COLOR, ELEMENT_REGIONS } from "@/lib/regions";
import { DESIRES, computeDesire } from "@/lib/desires";
import { personaOf } from "@/lib/personas";
import type {
  SummaryResponse,
  Forecast,
  RegionRec,
  SajuInput,
} from "@/lib/types";

const KoreaMap = dynamic(() => import("@/components/KoreaMap"), {
  ssr: false,
  loading: () => <div className="loading">지도 불러오는 중…</div>,
});

const CAT_EMOJI: Record<string, string> = {
  트레킹: "🥾",
  숲치유: "🌲",
  캠핑: "⛺",
  수목원: "🌿",
  "온천·스파": "♨️",
  해변: "🏖️",
  "축제·야경": "🎆",
  맛집투어: "🍜",
  전통문화: "🏯",
  한옥스테이: "🏠",
  "고궁·유적": "🏛️",
  농촌체험: "🌾",
  "미술관·전시": "🖼️",
  쇼핑: "🛍️",
  도심야경: "🌃",
  "암벽·클라이밍": "🧗",
  해양레저: "🚤",
  서핑: "🏄",
  호수카약: "🛶",
  워터파크: "💦",
};

// 간지 한자 → 한글 읽기 (예보 일진 표시용). 오행 글자(화·수·목·금·토)는 그대로 둠.
const GANJI_KO: Record<string, string> = {
  甲: "갑",
  乙: "을",
  丙: "병",
  丁: "정",
  戊: "무",
  己: "기",
  庚: "경",
  辛: "신",
  壬: "임",
  癸: "계",
  子: "자",
  丑: "축",
  寅: "인",
  卯: "묘",
  辰: "진",
  巳: "사",
  午: "오",
  未: "미",
  申: "신",
  酉: "유",
  戌: "술",
  亥: "해",
};
const ganjiToKo = (s: string) =>
  s
    .split("")
    .map((c) => GANJI_KO[c] ?? c)
    .join("");

const WD = ["일", "월", "화", "수", "목", "금", "토"];
const fmtKDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return `${m}월 ${d}일 (${WD[new Date(y, m - 1, d).getDay()]})`;
};
const fmtFullKDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일 (${WD[new Date(y, m - 1, d).getDay()]})`;
};
const todayStr = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};
const cleanPlace = (r?: string) =>
  (r ?? "").split(/[·,( ]/)[0].trim() || "어딘가";
// 방위 한 글자 → 자연스러운 표기 ("동" → "동쪽")
const DIR_KO: Record<string, string> = {
  동: "동쪽",
  남: "남쪽",
  서: "서쪽",
  북: "북쪽",
  중앙: "중앙",
};
const dirKo = (d: string) => DIR_KO[d] ?? d;
// 서버 문구의 "(동)" → "(동쪽)" 보정 (예보 헤드라인 등). 방위 오해 방지.
const fixDir = (s: string) =>
  s.replace(/\((동|남|서|북)\)/g, (_, d: string) => `(${DIR_KO[d]})`);
// 한국어 조사 로/으로 (받침 유무)
const ro = (w: string) => {
  const c = w.charCodeAt(w.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return "로";
  const jong = (c - 0xac00) % 28;
  return jong === 0 || jong === 8 ? "로" : "으로";
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));
const daysInMonth = (y: number, m: number) =>
  y >= 1 && m >= 1 && m <= 12 ? new Date(y, m, 0).getDate() : 31;

// 날짜 문자열을 시드로 한 결정론적 셔플. 같은 날엔 고정, 날짜 바뀌면 다른 순서.
// (서버 region 리스트가 오행별 고정이라 매번 같아 보이는 문제를 프론트에서 해소)
function seededPick<T>(arr: T[], seed: string, n: number): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

// 4스텝 진행 닷 (현재 스텝만 강조)
function StepDots({ current }: { current: number }) {
  return (
    <div className="stepdots">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`dot${n === current ? " on" : ""}`} />
      ))}
    </div>
  );
}

// 모든 스텝 하단 공통 이전/다음 네비게이션 (일관 배치)
function StepNav({
  prev,
  next,
}: {
  prev?: { label: string; onClick: () => void };
  next?: { label: string; onClick: () => void };
}) {
  return (
    <div className="stepnav">
      {prev && (
        <button
          type="button"
          className={`nav-btn prev${next ? "" : " solo"}`}
          onClick={prev.onClick}
          aria-label={prev.label}
          title={prev.label}
        >
          ←
        </button>
      )}
      {next && (
        <button type="button" className="nav-btn next" onClick={next.onClick}>
          {next.label} →
        </button>
      )}
    </div>
  );
}

// STEP2 헤드라인: 추천지를 타자기 효과로 한 글자씩 쓰고 지우며 순환.
// 조사(로/으로)는 부분 텍스트가 아니라 '완성된 단어' 기준으로 고정해 깜빡임을 막는다.
function RotatingPlace({ words }: { words: string[] }) {
  const key = (words.length ? words : ["어딘가"]).join("|");
  const [text, setText] = useState("");
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"typing" | "deleting">("typing");

  // 추천지 목록(예보)이 바뀌면 처음부터
  useEffect(() => {
    setText("");
    setIdx(0);
    setPhase("typing");
  }, [key]);

  useEffect(() => {
    const arr = key.split("|");
    const word = arr[idx % arr.length] ?? "";
    let t: ReturnType<typeof setTimeout> | undefined;
    if (phase === "typing") {
      if (text.length < word.length) {
        t = setTimeout(() => setText(word.slice(0, text.length + 1)), 110);
      } else if (arr.length > 1) {
        t = setTimeout(() => setPhase("deleting"), 1500);
      }
    } else {
      if (text.length > 0) {
        t = setTimeout(() => setText(word.slice(0, text.length - 1)), 55);
      } else {
        setIdx((i) => (i + 1) % arr.length);
        setPhase("typing");
      }
    }
    return () => clearTimeout(t);
  }, [text, phase, idx, key]);

  const arr = key.split("|");
  const word = arr[idx % arr.length] ?? "";
  return (
    <div className="bigline">
      <strong className="bigplace-type">
        {text}
        <span className="type-caret" aria-hidden="true" />
      </strong>
      {ro(word)} 떠나는 거 어때?
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [form, setForm] = useState<SajuInput>({
    calendar_type: "solar",
    year: 1996,
    month: 5,
    day: 15,
  });
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [forecastBusy, setForecastBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapPick, setMapPick] = useState<{
    name: string;
    element?: string;
    province: string;
  } | null>(null);
  const mapPickRef = useRef<HTMLDivElement>(null);
  // 오방지도에서 선택한 도/광역시 + 전체 시·군·구 데이터 (하단 리스트 동적 교체용)
  const [mapProvince, setMapProvince] = useState<{
    code: string;
    name: string;
  } | null>(null);
  const [cities, setCities] = useState<
    Array<{ name: string; provCode: string; element: string; code: string }>
  >([]);
  const [selectedDate, setSelectedDate] = useState("");
  const dateRef = useRef<HTMLInputElement>(null);
  const [hydrated, setHydrated] = useState(false);

  // /trips 등 다른 라우트로 갔다가 '이전'으로 돌아오면 SPA 상태가 초기화돼
  // 입력(스텝1) 화면으로 튕긴다. 세션 스토리지에 스냅샷을 저장/복원해 막는다.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("lm_state");
      if (raw) {
        const s = JSON.parse(raw);
        if (s.summary) {
          if (s.form) setForm(s.form);
          setSummary(s.summary);
          setForecast(s.forecast ?? null);
          setStep(s.step ?? 2);
          setSelectedDate(s.selectedDate ?? "");
          setMapPick(s.mapPick ?? null);
        }
      }
    } catch {
      /* 무시 */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(
        "lm_state",
        JSON.stringify({
          form,
          summary,
          forecast,
          step,
          selectedDate,
          mapPick,
        }),
      );
    } catch {
      /* 무시 */
    }
  }, [hydrated, form, summary, forecast, step, selectedDate, mapPick]);

  // 지도에서 지역 선택 시 결과 패널로 부드럽게 스크롤 (선택됐다는 피드백)
  useEffect(() => {
    if (mapPick)
      mapPickRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
  }, [mapPick]);

  // 스텝 전환 시 상단으로 스크롤 (페이지가 넘어간 느낌)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // 오방지도 도/광역시 선택 시 하단 리스트를 그 지역 시·군·구로 교체하기 위한 데이터.
  useEffect(() => {
    let alive = true;
    fetch("/maps/cities.json")
      .then((r) => r.json())
      .then(
        (j: {
          features?: Array<{
            properties: {
              name: string;
              provCode: string;
              element: string;
              code: string;
            };
          }>;
        }) => {
          if (!alive) return;
          setCities(
            (j.features ?? []).map((f) => ({
              name: f.properties.name,
              provCode: f.properties.provCode,
              element: f.properties.element,
              code: f.properties.code,
            })),
          );
        },
      )
      .catch(() => {
        /* 로드 실패 시 기본(전국 추천) 유지 */
      });
    return () => {
      alive = false;
    };
  }, []);

  async function loadForecast(s: SummaryResponse, date?: string) {
    const dayStem = s.pillars.day.hanja?.[0];
    if (!dayStem) return;
    setForecastBusy(true);
    try {
      const f = await fetchForecast(
        dayStem,
        s.interpretation.recommended_elements,
        s.interpretation.avoid_elements,
        date,
      );
      setForecast(f);
      setSelectedDate(f.date);
    } catch {
      /* 예보 실패 무시 */
    } finally {
      setForecastBusy(false);
    }
  }

  function onDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.value && summary) loadForecast(summary, e.target.value);
  }

  function openCalendar() {
    const el = dateRef.current as
      | (HTMLInputElement & { showPicker?: () => void })
      | null;
    if (!el) return;
    try {
      el.showPicker ? el.showPicker() : el.focus();
    } catch {
      el.focus();
    }
  }

  function set<K extends keyof SajuInput>(key: K, value: SajuInput[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value } as SajuInput;
      if (key !== "calendar_type") {
        next.year = clamp(next.year, 0, 2050);
        next.month = clamp(next.month, 0, 12);
        next.day = clamp(next.day, 0, daysInMonth(next.year, next.month));
      }
      return next;
    });
  }

  const validRange =
    form.year >= 1900 &&
    form.year <= 2050 &&
    form.month >= 1 &&
    form.month <= 12 &&
    form.day >= 1 &&
    form.day <= daysInMonth(form.year, form.month);

  function onSelectMunicipality(
    name: string,
    element: string | undefined,
    province: string,
  ) {
    // 상품은 /trips 전용 페이지에서 보여줌 — 여기선 선택 피드백만.
    setMapPick({ name, element, province });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAnalyzing(true);
    setError(null);
    setSummary(null);
    setForecast(null);
    setMapPick(null);
    setMapProvince(null);
    setSelectedDate("");
    // '분석 중…' 리빌 한 박자 — 결과 fetch와 최소 노출 시간을 동시에 기다림
    const beat = new Promise((r) => setTimeout(r, 1800));
    try {
      const d = await fetchSummary(form);
      setSummary(d);
      await loadForecast(d);
      await beat;
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setAnalyzing(false);
    }
  }

  const itp = summary?.interpretation;
  const st = itp?.strength;
  const ready = !!(summary && itp && st);
  // 오방지도 강조: 추천 오행 + 희신(favorable)으로 최대 3개 기운까지 밝게 (공유 카드와 동일 기준)
  const mapElements = itp
    ? Array.from(
        new Set([
          ...itp.recommended_elements,
          ...(itp.strength.favorable_elements ?? []),
        ]),
      ).slice(0, 3)
    : [];
  // 추천지 셔플 시드: 날짜 + 생년월일 → 같은 오행·같은 날이어도 사람마다 다른 3곳.
  const birthKey = `${form.year}-${form.month}-${form.day}-${form.calendar_type}`;
  // 선택한 도 안에서 '잘 맞는'(밝게 표시되는 기운) 시·군·구 전부
  const provinceMatches = mapProvince
    ? cities.filter(
        (c) =>
          c.provCode === mapProvince.code && mapElements.includes(c.element),
      )
    : [];

  return (
    <main className="wrap">
      {analyzing && <Analyzing />}

      {/* ───────── STEP 1 · 입력 ───────── */}
      {step === 1 && (
        <div className="step" key="s1">
          <header className="hero">
            <div className="brand">Lucky Matching</div>
            <div className="bighook">
              어디 갈지 고민 될땐 럭키매칭에게 물어봐!
            </div>
            <div className="hero-icons" aria-hidden="true">
              {(["목", "화", "토", "금", "수"] as const).map((el) => (
                <ElementIcon key={el} element={el} size={34} className="hero-icon" />
              ))}
            </div>
          </header>

          <form className="card" onSubmit={onSubmit}>
            <div className="eyebrow">생년월일</div>
            <div className="seg">
              <button
                type="button"
                className={form.calendar_type === "solar" ? "on" : ""}
                onClick={() => set("calendar_type", "solar")}
              >
                양력
              </button>
              <button
                type="button"
                className={form.calendar_type === "lunar" ? "on" : ""}
                onClick={() => set("calendar_type", "lunar")}
              >
                음력
              </button>
            </div>
            <div className="dob">
              <div className="field">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={form.year}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    set("year", +e.target.value.replace(/[^\d]/g, ""))
                  }
                />
                <label>년(YYYY)</label>
              </div>
              <div className="field">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={form.month}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    set("month", +e.target.value.replace(/[^\d]/g, ""))
                  }
                />
                <label>월(MM)</label>
              </div>
              <div className="field">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={form.day}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    set("day", +e.target.value.replace(/[^\d]/g, ""))
                  }
                />
                <label>일(DD)</label>
              </div>
            </div>
            {!validRange && (
              <p className="hint">1900~2050년 사이로 다시 확인해줘.</p>
            )}
            <button
              className="cta"
              type="submit"
              disabled={analyzing || !validRange}
            >
              {analyzing ? "오행 계산 중…" : "오늘 어디 갈까?"}
            </button>
          </form>

          {error && <div className="err">앗, 뭔가 꼬였어: {error}</div>}
        </div>
      )}

      {/* ───────── STEP 2 · 사주 프로필 ───────── */}
      {step === 2 && ready && summary && itp && st && (
        <div className="step" key="s2">
          <div className="stepbar">
            <button
              type="button"
              className="brand-sm brand-sm-link"
              onClick={() => setStep(1)}
              aria-label="처음으로"
              title="처음으로"
            >
              Lucky Matching
            </button>
            <StepDots current={2} />
          </div>

          <div className="bighook">
            {forecast ? (
              <>
                {/* 날짜 표시 + 그 위에 투명한 실제 date input 오버레이.
                    iOS 사파리는 showPicker() 미지원이라, 진짜 input을 직접 탭해야
                    네이티브 피커가 열린다. 데스크톱은 버튼/탭 어느 쪽이든 동작. */}
                <span className="bigdate-wrap">
                  <button
                    type="button"
                    className="bigdate-inline"
                    onClick={openCalendar}
                    aria-label="날짜 변경"
                    title="날짜 변경"
                  >
                    {fmtFullKDate(forecast.date)}{" "}
                    <span className="cal-caret">▾</span>
                  </button>
                  <input
                    ref={dateRef}
                    type="date"
                    className="bigdate-input"
                    value={selectedDate || forecast.date}
                    min="2020-01-01"
                    max="2030-12-31"
                    onChange={onDateChange}
                    aria-label="날짜 선택"
                  />
                </span>
                <RotatingPlace
                  words={seededPick(
                    forecast.region?.regions ?? [],
                    `${forecast.date}|${birthKey}`,
                    3,
                  ).map((r) => cleanPlace(r))}
                />
              </>
            ) : (
              <div className="bigline">네 기운을 펼쳐봤어 👇</div>
            )}
          </div>

          <div className="persona">
            <div className="persona-emoji">
              <ElementIcon element={st.day_master_element} size={58} />
            </div>
            <div className="persona-body">
              <div className="persona-tag">
                <strong>{st.day_master_element} 일간</strong> ·{" "}
                {personaOf(st.day_master_element).tag}
              </div>
              <div className="persona-line">
                {personaOf(st.day_master_element).line}
              </div>
            </div>
          </div>

          {forecast &&
            (() => {
              const fcColor =
                ELEMENT_COLOR[forecast.today_element] ?? "#7c5cff";
              return (
                <div className={`forecast${forecastBusy ? " busy" : ""}`}>
                  <div className="fc-top">
                    <RadialGauge
                      value={forecast.score}
                      max={100}
                      color={fcColor}
                      label="오늘의 운"
                      size={96}
                    />
                    <div className="fc-top-r">
                      <div className="fc-verdict" style={{ color: fcColor }}>
                        {forecast.verdict}
                      </div>
                      <div className="fc-sub2">
                        일진: {ganjiToKo(forecast.today_pillar)} ·{" "}
                        {forecast.today_element} 기운
                      </div>
                      <div className="fc-god">
                        들어오는 기운: <b>{forecast.today_ten_god}</b>
                      </div>
                    </div>
                  </div>
                  <div className="fc-head">
                    {fixDir(forecast.headline.replace(/^[✨⚠️\s]+/, ""))}
                  </div>
                  {!!forecast.region?.regions?.length && (
                    <div className="fc-rec">
                      {seededPick(
                        forecast.region.regions,
                        `${forecast.date}|${birthKey}`,
                        3,
                      ).join(" · ")}
                    </div>
                  )}
                  {forecastBusy && (
                    <div className="fc-spinner">
                      <div className="orb-mini" />
                    </div>
                  )}
                </div>
              );
            })()}

          <StepNav
            prev={{ label: "다시 입력", onClick: () => setStep(1) }}
            next={{ label: "내 사주 보기", onClick: () => setStep(3) }}
          />
        </div>
      )}

      {/* ───────── STEP 3 · 사주 디테일 (명식 · 오행) ───────── */}
      {step === 3 && ready && summary && itp && st && (
        <div className="step" key="s3">
          <div className="stepbar">
            <button
              type="button"
              className="brand-sm brand-sm-link"
              onClick={() => setStep(1)}
              aria-label="처음으로"
              title="처음으로"
            >
              Lucky Matching
            </button>
            <StepDots current={3} />
          </div>

          <section className="card">
            <div className="eyebrow">나의 사주명식</div>
            <div className="pillars">
              {(
                [
                  ["연주", "year"],
                  ["월주", "month"],
                  ["일주", "day"],
                ] as const
              ).map(([role, key]) => (
                <div className="pillar" key={key}>
                  <div className="role">{role}</div>
                  <div className="hanja">
                    {summary.pillars[key].hangul ?? "—"}
                  </div>
                </div>
              ))}
            </div>
            <div className="stat">
              <BalanceMeter ratio={st.support_ratio} type={st.type} />
              <div className="stat-big">
                필요한 기운:{" "}
                {itp.recommended_elements.length ? (
                  itp.recommended_elements.map((el, i) => (
                    <span key={el}>
                      {i > 0 ? <span className="stat-dot"> · </span> : null}
                      <strong style={{ color: ELEMENT_COLOR[el] }}>{el}</strong>
                    </span>
                  ))
                ) : (
                  <strong>균형</strong>
                )}
              </div>
              <div className="stat-sub">
                일간: {summary.pillars.day.hangul?.[0]}({st.day_master_element})
                · 가장 강한 기운: {itp.dominant_element} · 가장 약한 기운: {}
                {itp.deficient_element}
              </div>
            </div>
          </section>

          <section className="card">
            <div className="eyebrow">나의 오행 분포</div>
            <ElementRadarIllustrated elements={summary.elements} />
          </section>

          <StepNav
            prev={{ label: "내 카드", onClick: () => setStep(2) }}
            next={{ label: "어디로 떠날까", onClick: () => setStep(4) }}
          />
        </div>
      )}

      {/* ───────── STEP 4 · 지도 · 욕망 · 추천 ───────── */}
      {step === 4 && ready && summary && itp && (
        <div className="step" key="s4">
          <div className="stepbar">
            <button
              type="button"
              className="brand-sm brand-sm-link"
              onClick={() => setStep(1)}
              aria-label="처음으로"
              title="처음으로"
            >
              Lucky Matching
            </button>
            <StepDots current={4} />
          </div>

          <section className="card">
            <div className="eyebrow">운세별 맞춤 추천</div>

            <div className="desire-list">
              {DESIRES.map((d) => {
                const r = computeDesire(
                  itp.strength.day_master_element,
                  summary.elements,
                  itp.recommended_elements,
                  itp.avoid_elements,
                  d,
                );
                const color = ELEMENT_COLOR[r.element];
                const region = (ELEMENT_REGIONS[r.element] ?? [])
                  .slice(0, 2)
                  .join(" · ");
                const why =
                  r.mode === "support"
                    ? `${r.target} 기운은 충분 — ${r.element} 기운으로 받쳐줘`
                    : `${r.ten} · ${r.element} 기운이 필요해!`;
                return (
                  <button
                    key={d.key}
                    type="button"
                    className="desire-card"
                    onClick={() =>
                      router.push(
                        `/trips?element=${encodeURIComponent(r.element)}&label=${encodeURIComponent(d.label)}`,
                      )
                    }
                  >
                    <div className="dc-icon">
                      <ElementIcon element={r.element} size={42} />
                    </div>
                    <div className="dc-body">
                      <div className="dc-head">
                        <span className="dc-label">
                          {d.emoji} {d.label}
                        </span>
                        <span className="dc-el" style={{ color }}>
                          {r.element}
                        </span>
                      </div>
                      <div className="dc-why">{why}</div>
                      <div className="dc-foot">
                        <span className="dc-region">📍 {region}</span>
                        <span className="dc-go"> →</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="card">
            <div className="eyebrow">지역별 맞춤 추천</div>
            <KoreaMap
              recommendedElements={mapElements}
              onSelectProvince={setMapProvince}
              onSelectMunicipality={onSelectMunicipality}
            />
            <div className="rec-list">
              {mapProvince && provinceMatches.length > 0 ? (
                <>
                  <div className="rec-list-title">
                    {mapProvince.name} · {provinceMatches.length}곳
                  </div>
                  {provinceMatches.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      className="rec-row"
                      onClick={() =>
                        router.push(
                          `/trips?region=${encodeURIComponent(c.name)}&element=${encodeURIComponent(c.element)}&label=${encodeURIComponent(c.name)}`,
                        )
                      }
                    >
                      <ElementIcon element={c.element} size={26} />
                      <span className="rec-places">{c.name}</span>
                      <span
                        className="rec-el"
                        style={{ color: ELEMENT_COLOR[c.element] }}
                      >
                        {c.element}
                      </span>
                      <span className="rec-go">→</span>
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <div className="rec-list-title">
                    {mapProvince
                      ? `${mapProvince.name} · 또렷하게 맞는 곳은 적어서 전국 추천을 보여줄게!`
                      : `너에게 부족한 ${itp.recommended_elements.join("·") || "균형의"} 기운을 채워야 해!`}
                  </div>
                  {itp.recommended_regions.map((r) => (
                    <button
                      key={r.element}
                      type="button"
                      className="rec-row"
                      onClick={() =>
                        router.push(
                          `/trips?element=${encodeURIComponent(r.element)}&label=${encodeURIComponent(r.regions[0] ?? r.element)}`,
                        )
                      }
                    >
                      <ElementIcon element={r.element} size={26} />
                      <span className="rec-places">
                        {r.regions.slice(0, 2).join(" · ")}
                      </span>
                      <span
                        className="rec-el"
                        style={{ color: ELEMENT_COLOR[r.element] }}
                      >
                        {r.element}
                      </span>
                      <span className="rec-go">→</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </section>

          <StepNav
            prev={{ label: "내 사주", onClick: () => setStep(3) }}
            next={{ label: "내 카드 만들기", onClick: () => setStep(5) }}
          />
        </div>
      )}

      {/* ───────── STEP 5 · 공유 카드 ───────── */}
      {step === 5 && ready && summary && (
        <div className="step" key="s5">
          <div className="stepbar">
            <button
              type="button"
              className="brand-sm brand-sm-link"
              onClick={() => setStep(1)}
              aria-label="처음으로"
              title="처음으로"
            >
              Lucky Matching
            </button>
            <StepDots current={5} />
          </div>

          <div className="share-step">
            <ShareCard summary={summary} forecast={forecast} />
          </div>

          <StepNav
            prev={{ label: "어디로 떠날까", onClick: () => setStep(4) }}
            next={{
              label: "럭키매칭에게 물어봐!",
              onClick: () => setChatOpen(true),
            }}
          />
        </div>
      )}

      <footer>AI가 생성한 참고용 결과예요 · 운세는 재미로만 봐주세요</footer>

      {ready && summary && (
        <GguiChat
          key={`${form.year}-${form.month}-${form.day}-${form.calendar_type}`}
          birth={form}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      )}
    </main>
  );
}

function RegionCard({ r }: { r: RegionRec }) {
  const color = ELEMENT_COLOR[r.element] ?? "var(--line)";
  return (
    <div className="region region-rec">
      <div className="rr-head">
        <div className="rr-icon">
          <ElementIcon element={r.element} size={46} />
        </div>
        <div className="rr-titles">
          <div className="rr-places">{r.regions.slice(0, 2).join(" · ")}</div>
          <div className="rr-sub" style={{ color }}>
            {r.element} 기운 · {dirKo(r.direction)} · {r.terrain}
          </div>
        </div>
      </div>
      <div className="because">{becauseLine(r.element)}</div>
      <div className="cats">
        {r.categories.map((c) => (
          <span className="tag" key={c}>
            {CAT_EMOJI[c] ?? "•"} {c}
          </span>
        ))}
      </div>
    </div>
  );
}
