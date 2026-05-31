"use client";

import { useRef, useState } from "react";
import type { SummaryResponse, Forecast } from "@/lib/types";
import { personaOf } from "@/lib/personas";
import { ELEMENT_ICON } from "@/lib/elementIcon";
import { ELEMENT_REGIONS } from "@/lib/regions";
import KoreaMini from "@/components/KoreaMini";

const ORDER = ["목", "화", "토", "금", "수"];
// 지도 라벨용으로 지역명을 짧게 ("설악산·속초" → "설악산", "지리산 둘레길" → "지리산")
const shortPlace = (s: string) => s.split(/[·,( ]/)[0].trim() || s;

const EL_COLOR: Record<string, string> = {
  목: "#2f9e6e",
  화: "#e2483d",
  토: "#d4a017",
  금: "#8895a7",
  수: "#2b6cb0",
};
const IDENTITY: Record<string, string> = {
  목: "숲을 품은 사람",
  화: "불 같은 사람",
  토: "단단한 사람",
  금: "날 선 도시 사람",
  수: "물처럼 흐르는 사람",
};

export default function ShareCard({
  summary,
  forecast,
}: {
  summary: SummaryResponse;
  forecast: Forecast | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const itp = summary.interpretation;
  const dom = itp.dominant_element;
  const total = Object.values(summary.elements).reduce((a, b) => a + b, 0) || 1;
  const pct = Math.round(((summary.elements[dom] ?? 0) / total) * 100);
  // 공유 동기: 추상 막대 대신 '내가 갈 곳'. 추천 여행지를 지도 위에 최대 3곳 라벨로.
  // 우선순위: 추천 오행의 대표지 → 부족분은 희신(favorable) 오행 → 그래도 모자라면 오행 순서.
  const placeLabels: Record<string, string> = {};
  const pickRegion = (el: string) =>
    itp.recommended_regions.find((r) => r.element === el)?.regions?.[0] ??
    ELEMENT_REGIONS[el]?.[0];
  for (const el of [
    ...itp.recommended_regions.map((r) => r.element),
    ...(itp.strength.favorable_elements ?? []),
    ...ORDER,
  ]) {
    if (Object.keys(placeLabels).length >= 3) break;
    if (placeLabels[el]) continue;
    const name = pickRegion(el);
    if (name) placeLabels[el] = shortPlace(name);
  }
  const placeElements = Object.keys(placeLabels);
  const hasPlaces = placeElements.length > 0;
  const topRegion =
    forecast?.region?.regions?.[0] ??
    itp.recommended_regions[0]?.regions[0] ??
    "어딘가";

  async function save() {
    if (!ref.current) return;
    setBusy(true);
    const node = ref.current;
    const swapped: Array<[HTMLImageElement, string]> = [];
    try {
      const html2canvas = (await import("html2canvas")).default;
      // 브랜드 폰트를 명시적으로 로드해야 html2canvas 캡처(서비스명)에 적용된다.
      // (캡처 대상에서만 쓰여 자동 로드가 안 될 수 있어 weight별로 강제 로드)
      const fontApi = (
        document as Document & {
          fonts?: {
            ready: Promise<unknown>;
            load?: (f: string) => Promise<unknown>;
          };
        }
      ).fonts;
      if (fontApi?.load) {
        await Promise.all([
          fontApi.load('400 22px "Cafe24PROUP"'),
          fontApi.load('800 30px "Cafe24PROUP"'),
        ]).catch(() => {});
      }
      if (fontApi?.ready) await fontApi.ready;
      // 외부 SVG <img>(/elements/*.svg)는 html2canvas가 래스터화하지 못해 누락된다.
      // 특히 iOS 사파리는 SVG data URI 조차 캡처에 실패 → 캡처 전 각 SVG를
      // 오프스크린 canvas로 PNG 래스터화한 뒤 img.src 를 PNG로 치환한다.
      // 그러면 html2canvas 는 순수 비트맵만 복사하므로 전 브라우저에서 안전.
      const rasterizeToPng = (src: string, w: number, h: number) =>
        new Promise<string | null>((resolve) => {
          const probe = new Image();
          probe.crossOrigin = "anonymous";
          probe.onload = () => {
            try {
              const scale = 3; // 고해상도 캡처(scale:3)와 맞춤
              const cw = Math.max(1, Math.round((w || probe.width) * scale));
              const ch = Math.max(1, Math.round((h || probe.height) * scale));
              const cv = document.createElement("canvas");
              cv.width = cw;
              cv.height = ch;
              const ctx = cv.getContext("2d");
              if (!ctx) return resolve(null);
              ctx.drawImage(probe, 0, 0, cw, ch);
              resolve(cv.toDataURL("image/png"));
            } catch {
              resolve(null);
            }
          };
          probe.onerror = () => resolve(null);
          probe.src = src;
        });

      const imgs = Array.from(
        node.querySelectorAll("img"),
      ) as HTMLImageElement[];
      await Promise.all(
        imgs.map(async (img) => {
          const src = img.getAttribute("src") || "";
          if (!src || src.startsWith("data:image/png")) return;
          const rect = img.getBoundingClientRect();
          const png = await rasterizeToPng(
            src,
            rect.width || img.width,
            rect.height || img.height,
          );
          if (!png) return; // 실패 시 원본 유지
          swapped.push([img, src]);
          img.src = png;
          await new Promise<void>((r) => {
            if (img.complete && img.naturalWidth) r();
            else {
              img.onload = () => r();
              img.onerror = () => r();
            }
          });
        }),
      );
      // 인스타 스토리 권장 해상도(1080×1920)에 맞춰 9:16 카드(360×640)를 3배 캡처
      const canvas = await html2canvas(node, {
        scale: 3,
        backgroundColor: "#0a0a0c",
        logging: false,
        useCORS: true,
        imageTimeout: 4000,
      });
      await new Promise<void>((resolve) =>
        canvas.toBlob(async (blob) => {
          if (!blob) return resolve();
          const file = new File([blob], "lucky-matching.png", {
            type: "image/png",
          });
          const nav = navigator as Navigator & {
            canShare?: (d: { files: File[] }) => boolean;
          };
          if (nav.canShare?.({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: "Lucky Matching",
                text: "나는 " + IDENTITY[dom],
              });
              return resolve();
            } catch {
              /* fall through */
            }
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "lucky-matching.png";
          a.click();
          URL.revokeObjectURL(url);
          resolve();
        }, "image/png"),
      );
    } finally {
      for (const [img, src] of swapped) img.src = src;
      setBusy(false);
    }
  }

  return (
    <section className="">
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div
          ref={ref}
          style={{
            width: 360,
            height: 640,
            padding: "36px 30px",
            borderRadius: 28,
            background:
              "linear-gradient(160deg, #15122c 0%, #1a1430 55%, #241a2c 100%)",
            border: "1px solid #2a2a31",
            color: "#f4f4f6",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontFamily: "Cafe24PROUP, sans-serif",
              fontSize: 24,
              letterSpacing: "-0.5px",
              textAlign: "center",
            }}
          >
            Lucky Matching
          </div>
          <div
            style={{
              fontFamily: "Cafe24PROUP, sans-serif",
              fontSize: 12,
              letterSpacing: "2px",
              textAlign: "center",
            }}
          >
            Luckymatching.n2f.site
          </div>

          <div>
            <div style={{ textAlign: "center" }}>
              {ELEMENT_ICON[dom] ? (
                <img
                  src={ELEMENT_ICON[dom]}
                  alt=""
                  width={104}
                  height={104}
                  style={{
                    width: 104,
                    height: 104,
                    objectFit: "contain",
                    margin: "0 auto",
                    display: "block",
                  }}
                />
              ) : (
                <div style={{ fontSize: 64, lineHeight: 1 }}>✨</div>
              )}
              <div
                style={{
                  fontFamily: "Cafe24PROUP, sans-serif",
                  fontSize: 32,
                  fontWeight: 800,
                  marginTop: 12,
                }}
              >
                {IDENTITY[dom]}
              </div>
              <div
                style={{
                  color: "#c9c3ea",
                  fontSize: 13,
                  marginTop: 6,
                  lineHeight: 1.45,
                }}
              >
                {personaOf(dom).line}
              </div>
              <div style={{ color: "#b9b3e0", fontSize: 14, marginTop: 7 }}>
                오행 <b style={{ color: EL_COLOR[dom] }}>{dom}</b> {pct}% ·{" "}
                {itp.strength.type}
              </div>
            </div>

            {hasPlaces && (
              <div style={{ margin: "22px 0 0" }}>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <KoreaMini
                    highlight={placeElements}
                    labels={placeLabels}
                    size={168}
                  />
                </div>
              </div>
            )}
          </div>
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "#86868c" }}>오늘의 운</div>
                <div
                  style={{
                    fontFamily: "Cafe24PROUP, sans-serif",
                    fontSize: 30,
                    fontWeight: 800,
                    color: "#7c5cff",
                    lineHeight: 1.1,
                  }}
                >
                  {forecast?.score ?? "--"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#86868c" }}>
                  오늘의 행운 장소
                </div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{topRegion}</div>
              </div>
            </div>
            <div
              style={{
                marginTop: 16,
                fontSize: 11,
                color: "#8e8aa3",
                textAlign: "center",
                fontFamily: "ui-monospace, monospace",
                letterSpacing: "1px",
              }}
            ></div>
          </div>
        </div>
      </div>
      <button
        className="cta"
        style={{ marginTop: 14 }}
        onClick={save}
        disabled={busy}
      >
        {busy ? "만드는 중…" : "이미지 저장 및 공유"}
      </button>
    </section>
  );
}
