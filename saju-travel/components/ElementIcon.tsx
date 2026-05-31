import { ELEMENT_ICON } from "@/lib/elementIcon";

// 오행 일러스트 아이콘. 자산 없으면 이모지로 폴백.
const FALLBACK: Record<string, string> = { 목: "🌳", 화: "🔥", 토: "⛰️", 금: "🏙️", 수: "🌊" };

export default function ElementIcon({ element, size = 40, className }: { element: string; size?: number; className?: string }) {
  const src = ELEMENT_ICON[element];
  if (!src) {
    return <span className={className} style={{ fontSize: size * 0.82, lineHeight: 1 }}>{FALLBACK[element] ?? "✨"}</span>;
  }
  return (
    <img
      className={className}
      src={src}
      alt={`${element} 기운`}
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain", display: "block" }}
    />
  );
}
