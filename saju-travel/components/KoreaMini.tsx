import { Fragment } from "react";
import { KOREA_MINI_ANCHORS, KOREA_MINI_PATH, KOREA_MINI_VIEW } from "@/lib/koreaMini";
import { ELEMENT_ICON } from "@/lib/elementIcon";

const ORDER = ["목", "화", "토", "금", "수"];

// 공유 카드용 한국 미니 지도.
// 추천 오행 지점은 일러스트 아이콘 + 지역명으로 오버레이(원형점 대체), 나머지는 흐린 점.
// 아이콘/라벨은 SVG 위 HTML 레이어라 html2canvas 캡처에 안전(외부 SVG <image> 회피).
export default function KoreaMini({
  highlight,
  labels,
  size = 140,
}: {
  highlight: string[];
  labels?: Record<string, string>;
  size?: number;
}) {
  const { w, h } = KOREA_MINI_VIEW;
  const scale = size / w;
  const renderH = (size * h) / w;
  const set = new Set(highlight);

  return (
    <div style={{ position: "relative", width: size, height: renderH }}>
      <svg width={size} height={renderH} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }} aria-hidden>
        <path
          d={KOREA_MINI_PATH}
          fill="rgba(124,92,255,0.10)"
          stroke="rgba(124,92,255,0.45)"
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
        {ORDER.filter((el) => !set.has(el)).map((el) => {
          const a = KOREA_MINI_ANCHORS[el];
          if (!a) return null;
          return <circle key={el} cx={a.x} cy={a.y} r={2} fill="#6b6b78" opacity={0.5} />;
        })}
      </svg>

      {ORDER.filter((el) => set.has(el)).map((el) => {
        const a = KOREA_MINI_ANCHORS[el];
        if (!a) return null;
        const px = a.x * scale;
        const py = a.y * scale;
        const icon = ELEMENT_ICON[el];
        const name = labels?.[el];
        return (
          <Fragment key={el}>
            {icon ? (
              <img
                src={icon}
                alt=""
                width={30}
                height={30}
                style={{
                  position: "absolute",
                  left: px,
                  top: py,
                  width: 30,
                  height: 30,
                  objectFit: "contain",
                  transform: "translate(-50%, -50%)",
                  filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))",
                  pointerEvents: "none",
                }}
              />
            ) : (
              <span style={{ position: "absolute", left: px, top: py, transform: "translate(-50%, -50%)", fontSize: 22 }}>📍</span>
            )}
            {name && (
              <span
                style={{
                  position: "absolute",
                  left: px,
                  top: py + 17,
                  transform: "translate(-50%, 0)",
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#fff",
                  whiteSpace: "nowrap",
                  letterSpacing: "-0.2px",
                  textShadow: "0 1px 4px rgba(0,0,0,0.9)",
                  pointerEvents: "none",
                }}
              >
                {name}
              </span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
