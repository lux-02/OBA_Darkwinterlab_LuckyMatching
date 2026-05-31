"use client";

import { useEffect, useState } from "react";

const MSGS = [
  "만세력을 펼치는 중…",
  "오행 계산 중…",
  "부족한 기운을 찾는 중…",
  "전국 명당을 훑는 중…",
  "오늘 들어오는 기운을 보는 중…",
];

export default function Analyzing() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % MSGS.length), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="analyzing">
      <div className="analyzing-orb" />
      <div className="analyzing-msg">{MSGS[i]}</div>
    </div>
  );
}
