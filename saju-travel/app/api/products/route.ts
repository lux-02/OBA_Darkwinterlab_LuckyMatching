import { NextRequest, NextResponse } from "next/server";
import type { Product } from "@/lib/types";
import { searchProducts } from "@/lib/myrealtrip";

/**
 * MyRealTrip BFF — 마이리얼트립 MCP(searchTnas, 무인증)로 실상품 검색.
 * 오방 추천 지역명 → 투어·티켓·액티비티 상품 카드.
 * MCP 실패/무결과 시 데모 안전을 위해 폴백 mock 반환.
 */
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region") ?? "";
  const category = req.nextUrl.searchParams.get("category") ?? "투어";

  try {
    const products = await searchProducts(region, 3);
    if (products.length) {
      return NextResponse.json({ region, products, source: "myrealtrip" });
    }
  } catch {
    // MCP 실패 → 폴백
  }

  const fallback: Product[] = [
    { name: `${region} ${category} 추천상품`, meta: "마이리얼트립 · ★4.8", mock: true, thumbEmoji: "🎫" },
    { name: `${region} 현지 가이드 투어`, meta: "마이리얼트립 · ★4.7", mock: true, thumbEmoji: "🧭" },
  ];
  return NextResponse.json({ region, products: fallback, source: "fallback" });
}
