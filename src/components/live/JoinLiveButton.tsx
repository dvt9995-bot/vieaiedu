"use client";
import { useEffect, useState } from "react";
import { toast } from "@/components/Toaster";

const OPEN_BEFORE = 15 * 60 * 1000;
const GRACE_AFTER = 30 * 60 * 1000;

function fmt(d: Date) { return d.toLocaleString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }); }

// 1 buổi học live: hiển thị thời gian + nút vào lớp (mở 15' trước → hết giờ +30').
export default function JoinLiveButton({ sessionId, title, startsAt, durationMin, enrolled, recordingUrl }: { sessionId: string; title?: string | null; startsAt: string; durationMin: number; enrolled: boolean; recordingUrl?: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  const start = new Date(startsAt).getTime();
  const opensAt = start - OPEN_BEFORE;
  const endsAt = start + durationMin * 60000 + GRACE_AFTER;
  const state: "early" | "open" | "ended" = now < opensAt ? "early" : now > endsAt ? "ended" : "open";

  async function watchReplay() {
    setBusy(true);
    try {
      const r = await fetch(`/api/live/replay?session=${sessionId}`);
      const d = await r.json();
      if (r.ok && d.url) window.open(d.url, "_blank", "noopener");
      else if (d.error === "not_enrolled") toast("Bạn cần đăng ký khóa học này");
      else toast("Bản ghi đang được xử lý, vui lòng quay lại sau");
    } finally { setBusy(false); }
  }
  async function join() {
    setBusy(true);
    try {
      const r = await fetch(`/api/live/join?session=${sessionId}`);
      const d = await r.json();
      if (r.ok && d.url) { window.open(d.url, "_blank", "noopener"); return; }
      if (d.error === "early") toast("Lớp chưa mở — vui lòng quay lại trước giờ học 15 phút");
      else if (d.error === "ended") toast("Buổi học đã kết thúc");
      else if (d.error === "not_enrolled") toast("Bạn cần đăng ký khóa học này");
      else if (d.error === "no_link") toast("Link lớp chưa sẵn sàng, vui lòng đợi giảng viên");
      else toast("Không vào được lớp, thử lại sau");
    } finally { setBusy(false); }
  }

  const mins = Math.round((opensAt - now) / 60000);
  const countdown = mins > 1440 ? `mở ${Math.round(mins / 1440)} ngày nữa` : mins > 60 ? `mở sau ${Math.round(mins / 60)} giờ` : `mở sau ${Math.max(0, mins)} phút`;

  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate">{title || "Buổi học"}</div>
        <div className="text-xs text-ink-3">{fmt(new Date(startsAt))} · {durationMin} phút</div>
      </div>
      {!enrolled ? (
        <span className="text-xs text-ink-3 shrink-0">Đăng ký để vào lớp</span>
      ) : state === "open" ? (
        <button onClick={join} disabled={busy} className="shrink-0 rounded-full bg-accent hover:bg-accent-700 text-white text-sm font-semibold px-4 py-2 cursor-pointer animate-pulse">🔴 Vào lớp ngay</button>
      ) : state === "early" ? (
        <span className="shrink-0 text-xs font-semibold text-ink-2 bg-bg-soft rounded-full px-3 py-1.5">{countdown}</span>
      ) : recordingUrl ? (
        <button onClick={watchReplay} disabled={busy} className="shrink-0 rounded-full border border-border-strong text-sm font-semibold px-4 py-2 cursor-pointer">▶ Xem lại</button>
      ) : (
        <span className="shrink-0 text-xs text-ink-3">Đã kết thúc</span>
      )}
    </div>
  );
}
