"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ElementIcon from "@/components/ElementIcon";
import { becauseLine } from "@/lib/explain";
import { ELEMENT_ACTIVITIES, ELEMENT_COLOR, ELEMENT_REGIONS } from "@/lib/regions";
import type { Product } from "@/lib/types";

const CAT_EMOJI: Record<string, string> = {
  트레킹: "🥾", 숲치유: "🌲", 캠핑: "⛺", 수목원: "🌿", "온천·스파": "♨️", 해변: "🏖️", "축제·야경": "🎆", 맛집투어: "🍜",
  전통문화: "🏯", 한옥스테이: "🏠", "고궁·유적": "🏛️", 농촌체험: "🌾", "미술관·전시": "🖼️", 쇼핑: "🛍️", 도심야경: "🌃",
  "암벽·클라이밍": "🧗", 해양레저: "🚤", 서핑: "🏄", 호수카약: "🛶", 워터파크: "💦",
};

function TripsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const element = params.get("element") ?? "";
  const label = params.get("label") ?? "";
  // region 미지정 시 오행 대표 지역들을 순회
  const regionParam = params.get("region") ?? "";
  const regions = regionParam ? [regionParam] : (ELEMENT_REGIONS[element] ?? []).slice(0, 3);

  const [byRegion, setByRegion] = useState<Record<string, Product[] | null>>({});

  useEffect(() => {
    let alive = true;
    setByRegion(Object.fromEntries(regions.map((r) => [r, null])));
    regions.forEach(async (r) => {
      try {
        const res = await fetch(`/api/products?region=${encodeURIComponent(r)}`);
        const j = await res.json();
        if (alive) setByRegion((prev) => ({ ...prev, [r]: (j.products ?? []) as Product[] }));
      } catch {
        if (alive) setByRegion((prev) => ({ ...prev, [r]: [] }));
      }
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionParam, element]);

  const color = ELEMENT_COLOR[element] ?? "var(--accent)";

  return (
    <main className="wrap">
      <div className="stepbar">
        <div className="brand-sm">Lucky Matching</div>
      </div>

      <header className="trip-hero">
        {element && <ElementIcon element={element} size={88} />}
        <div className="trip-hero-title">
          {label ? <span style={{ color }}>{label}</span> : "맞춤 개운 여행"}
          {element && <> · <span style={{ color }}>{element} 기운</span></>}
        </div>
        {element && <p className="trip-hero-sub">{becauseLine(element)}</p>}
        {element && (
          <div className="cats" style={{ justifyContent: "center", marginTop: 12 }}>
            {(ELEMENT_ACTIVITIES[element] ?? []).map((c) => (
              <span className="tag" key={c}>{CAT_EMOJI[c] ?? "•"} {c}</span>
            ))}
          </div>
        )}
      </header>

      {regions.length === 0 && <div className="loading">추천할 지역을 찾지 못했어요. 돌아가서 다시 골라줘.</div>}

      {regions.map((r) => {
        const products = byRegion[r] ?? null;
        return (
          <section className="card" key={r}>
            <div className="trip-region">
              <span className="el" style={{ color }}>📍 {r}</span>
            </div>
            <div className="trip-products">
              {products === null ? (
                <div className="loading">상품 불러오는 중…</div>
              ) : products.length === 0 ? (
                <div className="muted">상품 준비 중</div>
              ) : (
                products.map((p, i) => (
                  <a className="trip-product" key={i} href={p.url ?? "#"} target={p.url ? "_blank" : undefined} rel="noreferrer">
                    <div className="trip-thumb">
                      {p.image ? (
                        <img src={p.image} alt="" />
                      ) : (
                        <span className="trip-thumb-emoji">{p.thumbEmoji ?? "🎫"}</span>
                      )}
                    </div>
                    <div className="trip-pinfo">
                      <div className="trip-pname">{p.name} {p.mock && <span className="mock-badge">DEMO</span>}</div>
                      <div className="trip-pmeta">{p.meta}</div>
                      <div className="trip-cta">자세히 보기 →</div>
                    </div>
                  </a>
                ))
              )}
            </div>
          </section>
        );
      })}

      <div className="stepnav">
        <button type="button" className="nav-btn prev solo" onClick={() => router.back()} aria-label="돌아가기" title="돌아가기">←</button>
      </div>

      <footer>AI가 생성한 참고용 결과예요 · 운세는 재미로만 봐주세요</footer>
    </main>
  );
}

export default function TripsPage() {
  return (
    <Suspense fallback={<main className="wrap"><div className="loading">불러오는 중…</div></main>}>
      <TripsInner />
    </Suspense>
  );
}
