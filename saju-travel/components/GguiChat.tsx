"use client";

import { useEffect, useState } from "react";
import type { SajuInput } from "@/lib/types";

// 새 탭 없이 saju-travel 안에서 GGUI 대화를 띄우는 팝업 모달.
// 배포된 GGUI 웹앱(NEXT_PUBLIC_GGUI_URL)을 iframe으로 로드.
//
// 성능: 사주 결과가 나오면(STEP2+) 이 컴포넌트를 화면 밖에 먼저 mount 해
// iframe 번들·게스트 토큰·sandbox 연결을 백그라운드로 미리 끝낸다(preload).
// 사용자가 STEP5에서 '럭키매칭에게 물어봐!'를 누르면(open=true) 즉시 펼쳐진다.
//
// 맥락: 생년월일을 `?birth=` 로 넘겨, GGUI 쪽이 사용자의 첫 메시지(스타터/직접입력
// 무관)에 사주 컨텍스트를 자동 prepend 한다. `?q=` 는 스타터 칩 문구.

const MSGS = [
  "럭키를 부르는 중…",
  "오늘의 기운을 챙기는 중…",
  "지도랑 명당을 펴는 중…",
  "대화를 여는 중…",
];

export default function GguiChat({
  birth,
  open,
  onClose,
}: {
  birth: SajuInput;
  open: boolean;
  onClose: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState(0);

  useEffect(() => {
    if (!open || loaded) return;
    const t = setInterval(() => setMsg((m) => (m + 1) % MSGS.length), 900);
    return () => clearInterval(t);
  }, [open, loaded]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const q = "내 사주에 맞는 여행지랑 오늘 운 추천해줘!";
  const birthParam = `${birth.year}-${birth.month}-${birth.day}-${birth.calendar_type}`;
  const base = process.env.NEXT_PUBLIC_GGUI_URL ?? "http://localhost:6890";
  const src = `${base}/?q=${encodeURIComponent(q)}&birth=${encodeURIComponent(birthParam)}`;

  return (
    <div
      className={`gchat-shell ${open ? "open" : "preload"}`}
      aria-hidden={!open}
      onClick={open ? onClose : undefined}
    >
      <div
        className="gchat"
        role="dialog"
        aria-label="럭키매칭에게 물어봐!"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gchat-bar">
          <button
            type="button"
            className="gchat-close"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="gchat-body">
          {open && !loaded && (
            <div className="gchat-loading">
              <div className="analyzing-orb" />
              <div className="analyzing-msg">{MSGS[msg]}</div>
              <div className="gchat-hint">
                대화 화면을 불러오고 있어요 — 잠시만요
              </div>
            </div>
          )}
          <iframe
            className="gchat-frame"
            src={src}
            title="사주 여행 친구"
            onLoad={() => setLoaded(true)}
            allow="clipboard-write"
          />
        </div>
      </div>
    </div>
  );
}
