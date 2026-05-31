import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Product } from "./types";

// 마이리얼트립 MCP 서버 (Streamable HTTP, 인증 불필요).
const MCP_URL = "https://mcp-servers.myrealtrip.com/mcp";
const TTL = 10 * 60 * 1000; // 지역별 응답 10분 캐시
const cache = new Map<string, { at: number; products: Product[] }>();

// 오방 지역명 → searchTnas 검색 키워드 정제.
// "강릉·동해안" → "강릉", "울진군" → "울진", "강릉시" → "강릉"
function cleanKeyword(region: string): string {
  let k = region.split(/[·\s(,/]/)[0].trim();
  if (k.length > 2 && /[시군구]$/.test(k)) k = k.slice(0, -1);
  return k;
}

// searchTnas는 UI 위젯 트리를 반환 → 트리를 walk하며 텍스트/이미지/딥링크 수집.
function walkAll(node: unknown, fn: (n: Record<string, unknown>) => void): void {
  if (Array.isArray(node)) {
    for (const c of node) walkAll(c, fn);
    return;
  }
  if (node && typeof node === "object") {
    fn(node as Record<string, unknown>);
    for (const v of Object.values(node)) {
      if (v && typeof v === "object") walkAll(v, fn);
    }
  }
}

function parseProducts(raw: string, limit: number): Product[] {
  let data: { widget?: { children?: unknown[] } };
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  const items = data?.widget?.children ?? [];
  const out: Product[] = [];
  for (const item of items) {
    const texts: string[] = [];
    let image: string | undefined;
    let url: string | undefined;
    walkAll(item, (n) => {
      if (typeof n.value === "string" && n.value.trim()) texts.push(n.value.trim());
      if (typeof n.src === "string" && !image) image = n.src;
      if (typeof n.url === "string" && /myrealtrip\.com/.test(n.url) && !url) url = n.url;
    });
    if (!texts.length) continue;
    const name = texts[0];
    const rating = texts.find((t) => t.includes("⭐"));
    // 숫자+원 (예: "11,500원~"). "[강원/양양]"의 '원' 오매칭 방지.
    const price = texts.find((t) => /[\d,]+\s*원/.test(t));
    const meta = [rating, price].filter(Boolean).join(" · ") || "마이리얼트립";
    out.push({ name, meta, url, image });
    if (out.length >= limit) break;
  }
  return out;
}

export async function searchProducts(region: string, limit = 3): Promise<Product[]> {
  const query = cleanKeyword(region);
  if (!query) return [];

  const hit = cache.get(query);
  if (hit && Date.now() - hit.at < TTL) return hit.products;

  const client = new Client({ name: "saju-travel", version: "0.1.0" }, { capabilities: {} });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  try {
    await client.connect(transport);
    const result = (await client.callTool({
      name: "searchTnas",
      arguments: { query, perPage: limit },
    })) as { content?: Array<{ text?: string }> };
    const raw = (result.content ?? []).map((c) => c.text ?? "").join("\n");
    const products = parseProducts(raw, limit);
    cache.set(query, { at: Date.now(), products });
    return products;
  } finally {
    await client.close().catch(() => {});
  }
}
