"use client";

// 강약 균형 미터 (압력계 스타일 포인터). 신약 ← → 신강.
export default function BalanceMeter({ ratio, type }: { ratio: number; type: string }) {
  const pct = Math.max(2, Math.min(98, ratio * 100));
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.06em", color: "var(--muted)", textTransform: "uppercase" }}>Balance</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{type} · {Math.round(ratio * 100)}%</span>
      </div>
      <div style={{ position: "relative", height: 8, borderRadius: 999, background: "linear-gradient(90deg, #2b6cb0, #21252e 45%, #21252e 55%, #e2483d)" }}>
        <div className="balance-pointer" style={{ ["--balance-pct" as string]: `${pct}%`, position: "absolute", left: `${pct}%`, top: -4, width: 3, height: 16, background: "#fff", borderRadius: 2, transform: "translateX(-50%)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em" }}>
        <span>신약</span>
        <span>신강</span>
      </div>
    </div>
  );
}
