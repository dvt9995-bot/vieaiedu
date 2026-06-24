"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "@/components/Toaster";

interface Sess { id: string; title: string | null; starts_at: string; duration_min: number; meet_url: string | null; recording_url: string | null; calendar_event_id: string | null; }

// Giảng viên quản lý các BUỔI của khóa LIVE. Nếu admin đã kết nối Google → link Meet tự sinh.
export default function LiveSessionManager({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const [sessions, setSessions] = useState<Sess[]>([]);
  const [gcal, setGcal] = useState(false);
  const [f, setF] = useState({ title: "", starts_at: "", duration_min: "90", meet_url: "" });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/instructor/live-sessions?course_id=${courseId}`).then((x) => x.json()).catch(() => ({}));
    setSessions(r.sessions || []); setGcal(!!r.gcal);
  }, [courseId]);
  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!f.starts_at) return toast("Chọn ngày giờ buổi học");
    if (!gcal && !f.meet_url.trim()) return toast("Dán link Google Meet (chưa kết nối tự động)");
    const res = await fetch("/api/instructor/live-sessions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: courseId, title: f.title, starts_at: new Date(f.starts_at).toISOString(), duration_min: Number(f.duration_min) || 90, meet_url: f.meet_url || undefined, position: sessions.length }),
    });
    const d = await res.json();
    if (!res.ok) return toast(d.error || "Lỗi tạo buổi");
    toast(d.autoMeet ? "Đã tạo buổi + tự sinh link Meet ✓" : "Đã tạo buổi học");
    setF({ title: "", starts_at: "", duration_min: "90", meet_url: "" }); setAdding(false); load();
  }
  async function del(id: string) { if (!confirm("Xóa buổi học này?")) return; await fetch(`/api/instructor/live-sessions?id=${id}`, { method: "DELETE" }); toast("Đã xóa buổi"); load(); }
  async function setRecording(s: Sess) {
    const v = prompt("Link bản ghi hình (YouTube/Drive/Bunny) cho buổi này:", s.recording_url || "");
    if (v === null) return;
    await fetch("/api/instructor/live-sessions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, recording_url: v.trim() || null }) });
    toast("Đã lưu link ghi hình"); load();
  }
  async function setLink(s: Sess) {
    const v = prompt("Link Google Meet cho buổi này:", s.meet_url || "");
    if (v === null) return;
    await fetch("/api/instructor/live-sessions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, meet_url: v.trim() || null }) });
    toast("Đã lưu link Meet"); load();
  }

  const inp = "px-3 py-2 rounded-lg border border-border-strong bg-surface text-sm outline-none focus:border-accent";
  const fmt = (d: string) => new Date(d).toLocaleString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-[rgba(11,12,14,.5)] backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface rounded-card border border-border shadow-lg w-full max-w-[640px] max-h-[85vh] overflow-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface">
          <h3 className="font-bold text-lg">📅 Buổi học trực tiếp</h3>
          <button onClick={onClose} className="text-ink-3 hover:text-ink text-2xl leading-none cursor-pointer">×</button>
        </div>
        <div className="p-5 space-y-3">
          <div className={`text-xs rounded-lg px-3 py-2 ${gcal ? "bg-success/10 text-success" : "bg-gold/15 text-warning"}`}>
            {gcal ? "✓ Đã kết nối Google — link Meet tự sinh khi tạo buổi." : "⚠ Chưa kết nối Google tự động — bạn cần dán link Meet thủ công cho mỗi buổi (Admin có thể kết nối Google để tự sinh)."}
          </div>

          {sessions.length === 0 ? <p className="text-ink-3 text-sm">Chưa có buổi nào.</p> : sessions.map((s) => (
            <div key={s.id} className="border border-border rounded-lg p-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <div className="flex-1 min-w-[180px]">
                <div className="text-sm font-semibold">{s.title || "Buổi học"}</div>
                <div className="text-xs text-ink-3">{fmt(s.starts_at)} · {s.duration_min}p {s.meet_url ? "· 🎥 có link" : "· ⚠ chưa có link"}</div>
              </div>
              <button onClick={() => setLink(s)} className="text-xs font-semibold text-accent cursor-pointer">Link Meet</button>
              <button onClick={() => setRecording(s)} className={`text-xs font-semibold cursor-pointer ${s.recording_url ? "text-success" : "text-ink-2 hover:text-accent"}`}>{s.recording_url ? "📼 có ghi hình" : "Ghi hình"}</button>
              <button onClick={() => del(s.id)} className="text-xs text-ink-3 hover:text-accent cursor-pointer">Xóa</button>
            </div>
          ))}

          {adding ? (
            <div className="border border-border rounded-lg p-3 bg-bg-soft grid sm:grid-cols-2 gap-2">
              <input className={`${inp} sm:col-span-2`} placeholder="Tên buổi (vd: Buổi 1 — Nhập môn)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
              <label className="text-xs text-ink-3 sm:col-span-2 -mb-1">Ngày & giờ bắt đầu</label>
              <input className={inp} type="datetime-local" value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} />
              <input className={inp} type="number" placeholder="Thời lượng (phút)" value={f.duration_min} onChange={(e) => setF({ ...f, duration_min: e.target.value })} />
              {!gcal && <input className={`${inp} sm:col-span-2`} placeholder="Link Google Meet (bắt buộc)" value={f.meet_url} onChange={(e) => setF({ ...f, meet_url: e.target.value })} />}
              <div className="flex gap-2 justify-end sm:col-span-2">
                <button onClick={add} className="rounded-full bg-accent hover:bg-accent-700 text-white text-sm font-semibold px-4 py-1.5 cursor-pointer">Tạo buổi</button>
                <button onClick={() => setAdding(false)} className="rounded-full border border-border-strong text-sm px-4 py-1.5 cursor-pointer">Hủy</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="w-full rounded-lg border border-dashed border-border-strong text-accent text-sm font-semibold py-2.5 cursor-pointer hover:bg-bg-soft">+ Thêm buổi học</button>
          )}
        </div>
      </div>
    </div>
  );
}
