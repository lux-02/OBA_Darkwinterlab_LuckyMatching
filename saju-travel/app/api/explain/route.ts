import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { desireBecause } from "@/lib/explain";

export const runtime = "nodejs";

// 키 이름 대소문자 모두 허용 (.env에 openai_api_key 소문자로 저장돼 있어도 동작)
const API_KEY = process.env.OPENAI_API_KEY ?? process.env.openai_api_key ?? "";
const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.5";

const cache = new Map<string, string>();

interface Body {
  desireLabel: string;
  target: string;
  element: string;
  ten?: string;
  mode: "fill" | "support";
  dominant?: string;
  strengthType?: string;
  dayElement?: string;
}

const SYSTEM = `너는 사주를 재미로 봐주는 친한 친구야. 사용자의 사주를 보고 '추천 기운의 장소'가 왜 너에게 맞는지 딱 한 문장으로 말해줘.
규칙: 반말, 따뜻하고 위트있게. 40자 이내 한 문장. 이모지는 0~1개만.
'사주는 과학' 같은 단정 금지. 어떤 지역도 '나쁘다/안 맞다'고 말하지 마.
오행 글자(목·화·토·금·수)는 써도 되지만 한자는 쓰지 마. 설명조·기계적 표현 금지.`;

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ text: "여기, 지금 너한테 딱이야.", source: "fallback" });
  }

  const fallback = desireBecause(body.desireLabel, body.target, body.element, body.mode);

  if (!API_KEY) {
    return NextResponse.json({ text: fallback, source: "no-key" });
  }

  const key = JSON.stringify([body.desireLabel, body.element, body.target, body.mode, body.dominant]);
  const hit = cache.get(key);
  if (hit) return NextResponse.json({ text: hit, source: "cache" });

  const user = [
    `욕망: ${body.desireLabel}`,
    body.dayElement ? `내 일간 기운: ${body.dayElement}` : "",
    body.strengthType ? `강약: ${body.strengthType}` : "",
    body.dominant ? `가장 강한 기운: ${body.dominant}` : "",
    `추천 기운: ${body.element}${body.ten ? ` (${body.ten})` : ""}`,
    body.mode === "fill" ? "상태: 이 기운이 부족해 채워야 함" : "상태: 이 기운이 과해 다른 기운으로 받쳐야 함",
    `→ '${body.element} 기운의 장소'가 왜 나에게 맞는지 한 문장.`,
  ].filter(Boolean).join("\n");

  try {
    const client = new OpenAI({ apiKey: API_KEY });
    const completion = await client.chat.completions.create({
      model: MODEL,
      reasoning_effort: "none",
      max_completion_tokens: 200,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
    });
    const text = completion.choices[0]?.message?.content?.trim();
    if (text) {
      cache.set(key, text);
      return NextResponse.json({ text, source: "openai", model: MODEL });
    }
    return NextResponse.json({ text: fallback, source: "empty" });
  } catch (e) {
    return NextResponse.json({ text: fallback, source: "error", error: e instanceof Error ? e.message : "unknown" });
  }
}
