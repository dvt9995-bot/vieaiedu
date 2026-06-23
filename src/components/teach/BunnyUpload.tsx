"use client";
import { useRef, useState } from "react";
import * as tus from "tus-js-client";
import { toast } from "@/components/Toaster";

// Tải video THẲNG từ trình duyệt → Bunny (TUS, chịu file lớn + có thanh %). Không qua server mình.
export default function BunnyUpload({ courseId, title, hasVideo, onDone }: { courseId: string; title: string; hasVideo?: boolean; onDone: (guid: string) => void }) {
  const [pct, setPct] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function start(file: File) {
    if (file.size > 3 * 1024 * 1024 * 1024) { setErr("File quá lớn (>3GB)"); return; }
    setErr(""); setPct(0);
    let a: { endpoint: string; signature: string; expire: number; videoId: string; libraryId: string; error?: string };
    try {
      const res = await fetch("/api/instructor/bunny", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId, title }) });
      a = await res.json();
      if (!res.ok) { setErr(a.error || "Không khởi tạo được upload"); setPct(null); return; }
    } catch { setErr("Lỗi kết nối"); setPct(null); return; }
    const upload = new tus.Upload(file, {
      endpoint: a.endpoint,
      retryDelays: [0, 3000, 6000, 12000, 24000],
      headers: { AuthorizationSignature: a.signature, AuthorizationExpire: String(a.expire), VideoId: a.videoId, LibraryId: a.libraryId },
      metadata: { filetype: file.type, title },
      onError: (e) => { setErr("Lỗi tải lên: " + e.message); setPct(null); },
      onProgress: (sent, total) => setPct(Math.round((sent / total) * 100)),
      onSuccess: () => { toast("Tải video lên thành công"); onDone(a.videoId); setPct(100); setTimeout(() => setPct(null), 1500); },
    });
    upload.start();
  }

  return (
    <div className="flex flex-col gap-1">
      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) start(f); e.currentTarget.value = ""; }} />
      {pct === null ? (
        <button onClick={() => inputRef.current?.click()} className={`text-xs font-semibold py-1 cursor-pointer ${hasVideo ? "text-success" : "text-accent"}`}>
          {hasVideo ? "🎬 đã có video · tải lại" : "⬆️ Tải video lên"}
        </button>
      ) : (
        <div className="flex items-center gap-2 min-w-[140px]">
          <div className="flex-1 h-1.5 rounded-full bg-bg-soft overflow-hidden"><div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} /></div>
          <span className="text-xs text-ink-2 tabular-nums">{pct}%</span>
        </div>
      )}
      {err && <p className="text-accent text-[11px]">{err}</p>}
    </div>
  );
}
