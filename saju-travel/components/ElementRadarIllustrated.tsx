import { ELEMENT_ICON } from "@/lib/elementIcon";

const EL_COLOR: Record<string, string> = { 목: "#2f9e6e", 화: "#e2483d", 토: "#d4a017", 금: "#8895a7", 수: "#2b6cb0" };
const ORDER = ["목", "화", "토", "금", "수"] as const;

// 오각형 꼭짓점에 오행 일러스트를 둔 커스텀 레이더(차트.js 점 대체).
// 순수 SVG라 위치가 정확하고, 아이콘을 정점에 정확히 배치할 수 있다.
export default function ElementRadarIllustrated({ elements, size = 280 }: { elements: Record<string, number>; size?: number }) {
  const c = size / 2;
  const maxR = size * 0.3; // 데이터 폴리곤 최대 반경
  const iconR = size * 0.4; // 아이콘 중심 거리 (정점 바깥)
  const iconSize = size * 0.12;
  const maxVal = Math.max(1, ...ORDER.map((k) => elements[k] ?? 0));
  const total = Math.max(1, ORDER.reduce((s, k) => s + (elements[k] ?? 0), 0));
  const pct = (k: string) => Math.round(((elements[k] ?? 0) / total) * 100);

  // 정점 i 각도: 12시(-90°)에서 시계방향 72°씩.
  const angle = (i: number) => ((-90 + i * 72) * Math.PI) / 180;
  const pt = (i: number, r: number): [number, number] => [c + r * Math.cos(angle(i)), c + r * Math.sin(angle(i))];

  const rings = [0.25, 0.5, 0.75, 1];
  const dataPoints = ORDER.map((k, i) => pt(i, ((elements[k] ?? 0) / maxVal) * maxR));
  const dataPath = dataPoints.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ") + " Z";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", margin: "0 auto" }}>
      {/* 그리드(동심 오각형) */}
      {rings.map((f) => {
        const ring = ORDER.map((_, i) => pt(i, maxR * f).map((n) => n.toFixed(1)).join(",")).join(" ");
        return <polygon key={f} points={ring} fill="none" stroke="#363b48" strokeWidth={1} />;
      })}
      {/* 축선 */}
      {ORDER.map((_, i) => {
        const [x, y] = pt(i, maxR);
        return <line key={i} x1={c} y1={c} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="#363b48" strokeWidth={1} />;
      })}
      {/* 데이터 폴리곤 (중심에서 확대 모션) */}
      <g className="radar-data">
        <path d={dataPath} fill="rgba(124,92,255,0.22)" stroke="#7c5cff" strokeWidth={2} strokeLinejoin="round" />
        {dataPoints.map(([x, y], i) => (
          <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={3.5} fill={EL_COLOR[ORDER[i]]} />
        ))}
      </g>
      {/* 정점 일러스트 + 수치 */}
      {ORDER.map((k, i) => {
        const [ix, iy] = pt(i, iconR);
        const src = ELEMENT_ICON[k];
        return (
          <g key={k}>
            {src && <image href={src} x={(ix - iconSize / 2).toFixed(1)} y={(iy - iconSize / 2).toFixed(1)} width={iconSize} height={iconSize} />}
            <text x={ix.toFixed(1)} y={(iy + iconSize / 2 + 11).toFixed(1)} textAnchor="middle" fontSize={11} fontWeight={800} fill={EL_COLOR[k]}>
              {k} {pct(k)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}
