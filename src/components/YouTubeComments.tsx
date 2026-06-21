"use client";
import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import { formatDate } from "@/lib/format";

interface Cmt { id: string; author: string; avatar: string; text: string; likes: number; time: string }

// Bình luận có sẵn của video YouTube nguồn (chỉ đọc) — tự làm mới định kỳ.
export default function YouTubeComments({ videoId }: { videoId: string }) {
  const [items, setItems] = useState<Cmt[] | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(8);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    setBusy(true);
    const d = await fetch(`/api/youtube-comments?id=${videoId}`).then((r) => r.json()).catch(() => ({ comments: [] }));
    setBusy(false);
    if (d.disabled) { setDisabled(true); return; }
    setItems(d.comments || []);
  }

  useEffect(() => {
    load();
    timer.current = setInterval(load, 120_000); // tự làm mới mỗi 2 phút
    return () => { if (timer.current) clearInterval(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  if (disabled || (items && items.length === 0)) return null; // không có/không bật → ẩn hẳn

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold tracking-tight">Thảo luận từ cộng đồng video {items ? <span className="text-ink-3 font-normal">({items.length})</span> : null}</h2>
        <button onClick={load} disabled={busy} className="text-sm text-ink-3 hover:text-accent cursor-pointer disabled:opacity-50">↻ {busy ? "Đang tải…" : "Làm mới"}</button>
      </div>

      {!items ? (
        <p className="text-ink-3 text-sm">Đang tải bình luận…</p>
      ) : (
        <>
          <div className="space-y-4">
            {items.slice(0, show).map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar src={c.avatar} name={c.author} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm"><b className="text-ink">{c.author}</b> <span className="text-ink-3 text-xs">· {c.time ? formatDate(c.time) : ""}</span></div>
                  <p className="text-ink-2 text-sm mt-0.5 whitespace-pre-wrap break-words">{c.text}</p>
                  {c.likes > 0 && <div className="text-ink-3 text-xs mt-1">♥ {c.likes.toLocaleString("vi-VN")}</div>}
                </div>
              </div>
            ))}
          </div>
          {show < items.length && (
            <button onClick={() => setShow((s) => s + 8)} className="mt-4 text-sm font-semibold text-accent hover:underline cursor-pointer">Xem thêm bình luận</button>
          )}
        </>
      )}
    </section>
  );
}
