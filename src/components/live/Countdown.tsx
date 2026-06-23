"use client";
import { useEffect, useState } from "react";

// Đếm ngược tới giờ khai giảng (tạo cảm giác khẩn cấp).
export default function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (now === null) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
  const Box = ({ v, l }: { v: number; l: string }) => (
    <div className="flex flex-col items-center bg-ink text-white rounded-lg px-2.5 py-1.5 min-w-[44px]">
      <span className="text-lg font-extrabold tabular-nums leading-none">{String(v).padStart(2, "0")}</span>
      <span className="text-[10px] opacity-70 mt-0.5">{l}</span>
    </div>
  );
  return (
    <div className="flex items-center justify-center gap-1.5 mt-1">
      {d > 0 && <Box v={d} l="ngày" />}<Box v={h} l="giờ" /><Box v={m} l="phút" /><Box v={s} l="giây" />
    </div>
  );
}
