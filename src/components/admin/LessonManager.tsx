"use client";
import { useEffect, useState, useCallback } from "react";

interface Lesson { id: string; title: string; duration_sec: number; is_preview: boolean; video_id: string | null; }
interface Section { id: string; title: string; lessons: Lesson[]; }

export default function LessonManager({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [newSection, setNewSection] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [lf, setLf] = useState({ title: "", duration: "300", preview: false, video: "" });

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/lessons?course_id=${courseId}`).then((x) => x.json());
    setSections(r.sections || []);
  }, [courseId]);
  useEffect(() => { load(); }, [load]);

  async function addSection() {
    if (!newSection.trim()) return;
    await fetch("/api/admin/sections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ course_id: courseId, title: newSection, position: sections.length }) });
    setNewSection(""); load();
  }
  async function delSection(id: string) { if (confirm("Xóa chương (và toàn bộ bài trong đó)?")) { await fetch(`/api/admin/sections?id=${id}`, { method: "DELETE" }); load(); } }

  async function addLesson(sectionId: string, count: number) {
    if (!lf.title.trim()) return;
    await fetch("/api/admin/lessons", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section_id: sectionId, course_id: courseId, title: lf.title, duration_sec: Number(lf.duration) || 0, is_preview: lf.preview, video_id: lf.video || null, position: count }),
    });
    setLf({ title: "", duration: "300", preview: false, video: "" }); setAddingTo(null); load();
  }
  async function delLesson(id: string) { await fetch(`/api/admin/lessons?id=${id}`, { method: "DELETE" }); load(); }
  async function togglePreview(l: Lesson) {
    await fetch("/api/admin/lessons", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: l.id, is_preview: !l.is_preview }) });
    load();
  }
  async function setVideo(l: Lesson) {
    const v = prompt("Bunny video ID cho bài này:", l.video_id || "");
    if (v === null) return;
    await fetch("/api/admin/lessons", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: l.id, video_id: v || null }) });
    load();
  }

  const inp = "px-3 py-2 rounded-lg border border-border-strong bg-surface text-sm outline-none focus:border-accent";

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-[rgba(11,12,14,.5)] backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface rounded-card border border-border shadow-lg w-full max-w-[640px] max-h-[85vh] overflow-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface">
          <h3 className="font-bold text-lg">Quản lý chương &amp; bài học</h3>
          <button onClick={onClose} className="text-ink-3 hover:text-ink text-2xl leading-none cursor-pointer">×</button>
        </div>
        <div className="p-5 space-y-4">
          {sections.map((s) => (
            <div key={s.id} className="border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between bg-bg-soft px-4 py-2.5">
                <span className="font-semibold text-sm">{s.title}</span>
                <button onClick={() => delSection(s.id)} className="text-ink-3 hover:text-accent text-xs font-semibold cursor-pointer">Xóa chương</button>
              </div>
              <ul>
                {s.lessons.map((l) => (
                  <li key={l.id} className="flex items-center gap-2 px-4 py-2 border-t border-border text-sm">
                    <span className="flex-1">{l.title} <span className="text-ink-3 text-xs">({Math.round(l.duration_sec / 60)}p)</span></span>
                    <button onClick={() => togglePreview(l)} className={`text-xs font-semibold px-2 py-0.5 rounded-full cursor-pointer ${l.is_preview ? "bg-accent-weak text-accent" : "text-ink-3 border border-border"}`}>{l.is_preview ? "Xem thử" : "Khóa"}</button>
                    <button onClick={() => setVideo(l)} className={`text-xs font-semibold cursor-pointer ${l.video_id ? "text-success" : "text-accent"}`}>{l.video_id ? "🎬 đã gán" : "Gán video"}</button>
                    <button onClick={() => delLesson(l.id)} className="text-ink-3 hover:text-accent text-xs cursor-pointer">Xóa</button>
                  </li>
                ))}
              </ul>
              {addingTo === s.id ? (
                <div className="px-4 py-3 border-t border-border bg-bg-soft grid sm:grid-cols-2 gap-2">
                  <input className={inp} placeholder="Tên bài" value={lf.title} onChange={(e) => setLf({ ...lf, title: e.target.value })} />
                  <input className={inp} type="number" placeholder="Thời lượng (giây)" value={lf.duration} onChange={(e) => setLf({ ...lf, duration: e.target.value })} />
                  <input className={`${inp} sm:col-span-2`} placeholder="Bunny video ID (tùy chọn)" value={lf.video} onChange={(e) => setLf({ ...lf, video: e.target.value })} />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={lf.preview} onChange={(e) => setLf({ ...lf, preview: e.target.checked })} /> Cho xem thử miễn phí</label>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => addLesson(s.id, s.lessons.length)} className="rounded-full bg-ink text-white text-sm font-semibold px-4 py-1.5 cursor-pointer">Thêm bài</button>
                    <button onClick={() => setAddingTo(null)} className="rounded-full border border-border-strong text-sm px-4 py-1.5 cursor-pointer">Hủy</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingTo(s.id)} className="w-full text-left px-4 py-2 border-t border-border text-accent text-sm font-semibold cursor-pointer hover:bg-bg-soft">+ Thêm bài học</button>
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <input className={`${inp} flex-1`} placeholder="Tên chương mới" value={newSection} onChange={(e) => setNewSection(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSection()} />
            <button onClick={addSection} className="rounded-full bg-accent hover:bg-accent-700 text-white text-sm font-semibold px-4 cursor-pointer">+ Thêm chương</button>
          </div>
        </div>
      </div>
    </div>
  );
}
