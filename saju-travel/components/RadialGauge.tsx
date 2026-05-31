"use client";

// 라디얼 링 게이지 (애플워치 활동링 스타일). 운 스코어 등 0~max 지표용.
export default function RadialGauge({
  value,
  max = 100,
  color,
  label,
  size = 92,
}: {
  value: number;
  max?: number;
  color: string;
  label?: string;
  size?: number;
}) {
  const stroke = 8;
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const cx = size / 2;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#26262d" strokeWidth={stroke} />
        <circle
          className="gauge-arc"
          cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${cx} ${cx})`}
          style={{ ["--gauge-len" as string]: `${c * pct}` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: size * 0.3, fontWeight: 800, lineHeight: 1, letterSpacing: "-1px" }}>{value}</div>
        {label && (
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 3 }}>{label}</div>
        )}
      </div>
    </div>
  );
}
