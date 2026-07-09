import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE_NAME, SITE_TAGLINE } from "./site-config";

// 동적 OG 이미지 — 카카오톡/링크드인/X 공유 미리보기 + 검색 신뢰 신호.
export const runtime = "nodejs";
export const alt = "럭키매칭 Lucky Matching — 사주 오행으로 떠나는 여행";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 오행 5색 (목·화·토·금·수)
const ELEMENTS = ["#3fb27f", "#ff6b5e", "#e0b341", "#dcdce6", "#4ea1ff"];

export default async function OpengraphImage() {
  // satori는 woff/ttf/otf 지원(woff2 미지원) → woff 사용. 한글 글리프 포함 폰트.
  const cafe24 = await readFile(
    join(process.cwd(), "public/fonts/Cafe24PROUP.woff"),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(120% 120% at 50% 0%, #16131f 0%, #0a0a0c 60%)",
          color: "#ffffff",
          fontFamily: "Cafe24",
          padding: "0 80px",
        }}
      >
        <div style={{ display: "flex", gap: 18, marginBottom: 36 }}>
          {ELEMENTS.map((c) => (
            <div
              key={c}
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: c,
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 150,
            fontWeight: 800,
            letterSpacing: "-4px",
            lineHeight: 1,
          }}
        >
          {SITE_NAME}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 46,
            color: "#9b8cff",
            marginTop: 14,
            letterSpacing: "2px",
          }}
        >
          Lucky Matching
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 40,
            color: "#c9c9d4",
            marginTop: 40,
            textAlign: "center",
          }}
        >
          {SITE_TAGLINE}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#7a7a88",
            marginTop: 54,
          }}
        >
          luckymatching.n2f.site · 무료
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Cafe24", data: cafe24, style: "normal", weight: 800 },
      ],
    },
  );
}
