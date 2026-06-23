"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "@/components/Toaster";
import { normalizeVideoInput } from "@/lib/video";
import BunnyUpload from "./BunnyUpload";

interface Lesson { id: string; title: string; duration_sec: number; is_preview: boolean; video_id: string | null; }
interface Section { id: string; title: string; lessons: Lesson[]; }

// Quản lý chương & bài cho GIẢNG VIÊN. Khóa thu phí → upload video lên app (Bunny); khóa free → link YouTube.
export default function TeachLessonManager({ courseId, isPaid, onClose }: { courseId: string; isPaid: boolean; onClose: () => void }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [newSection, setNewSection] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [lf, setLf] = useState({ title: "", duration: "300", preview: false, video: "" });

  const load = useCallback(async () => {
    const r = await fetch(`/api/instructor/lessons?course_id=${courseId}`).then((x) => x.json());
    setSections(r.sections || []);
  }, [courseId]);
  useEffect(() => { load(); }, [load]);

  async function addSection() {
    if (!newSection.trim()) return;
    await fetch("/api/instructor/sections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ course_id: courseId, title: newSection, position: sections.length }) });
    setNewSection(""); toast("Đã thêm chương"); load();
  }
  async function delSection(id: string) { if (confirm("Xóa chương (và toàn bộ bài trong đó)?")) { await fetch(`/api/instructor/sections?id=${id}`, { method: "DELETE" }); toast("Đã xóa chương"); load(); } }

  async function addLesson(sectionId: string, count: number) {
    if (!lf.title.trim()) return;
    await fetch("/api/instructor/lessons", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section_id: sectionId, course_id: courseId, title: lf.title, duration_sec: Number(lf.duration) || 0, is_preview: lf.preview, video_id: isPaid ? null : normalizeVideoInput(lf.video), position: count }),
    });
    setLf({ title: "", duration: "300", preview: false, video: "" }); setAddingTo(null); toast("Đã thêm bài học"); load();
  }
  async function delLesson(id: string) { await fetch(`/api/instructor/lessons?id=${id}`, { method: "DELETE" }); toast("Đã xóa bài học"); load(); }
  async function togglePreview(l: Lesson) {
    await fetch("/api/instructor/lessons", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: l.id, is_preview: !l.is_preview }) });
    load();
  }
  async function patchVideo(id: string, videoId: string | null) {
    await fetch("/api/instructor/lessons", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, video_id: videoId }) });
    load();
  }
  async function setYouTube(l: Lesson) {
    const cur = l.video_id?.startsWith("yt:") ? `https://youtu.be/${l.video_id.slice(3)}` : (l.video_id || "");
    const v = prompt("Dán link YouTube cho bài này:", cur);
    if (v === null) return;
    await patchVideo(l.id, normalizeVideoInput(v));
    toast(v.trim() ? "Đã gán video" : "Đã gỡ video");
  }

  const inp = "px-3 py-2 rounded-lg border border-border-strong bg-surface text-sm outline-none focus:border-accent";

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-[rgba(11,12,14,.5)] backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface rounded-card border border-border shadow-lg w-full max-w-[640px] max-h-[85vh] overflow-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface">
          <h3 className="font-bold text-lg">Chương &amp; bài học {isPaid ? "· 🔒 khóa thu phí" : "· miễn phí"}</h3>
          <button onClick={onClose} className="text-ink-3 hover:text-ink text-2xl leading-none cursor-pointer">×</button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-ink-3 -mt-1">{isPaid ? "Khóa thu phí: video được tải lên hệ thống (bảo vệ, không lộ link). Bấm “Tải video lên” ở từng bài." : "Khóa miễn phí: gán link YouTube cho từng bài."}</p>
          {sections.map((s) => (
            <div key={s.id} className="border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between bg-bg-soft px-4 py-2.5">
                <span className="font-semibold text-sm">{s.title}</span>
                <button onClick={() => delSection(s.id)} className="text-ink-3 hover:text-accent text-xs font-semibold cursor-pointer">Xóa chương</button>
              </div>
              <ul>
                {s.lessons.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 border-t border-border text-sm">
                    <span className="basis-full sm:basis-auto sm:flex-1 min-w-0">{l.title} <span className="text-ink-3 text-xs">({Math.round(l.duration_sec / 60)}p)</span></span>
                    <button onClick={() => togglePreview(l)} className={`text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer ${l.is_preview ? "bg-accent-weak text-accent" : "text-ink-3 border border-border"}`}>{l.is_preview ? "Xem thử" : "Khóa"}</button>
                    {isPaid ? (
                      <BunnyUpload courseId={courseId} title={l.title} hasVideo={!!l.video_id} onDone={(guid) => patchVideo(l.id, guid)} />
                    ) : (
                      <button onClick={() => setYouTube(l)} className={`text-xs font-semibold py-1 cursor-pointer ${l.video_id ? "text-success" : "text-accent"}`}>{l.video_id ? "🎬 đã gán" : "Gán video"}</button>
                    )}
                    <button onClick={() => delLesson(l.id)} className="text-ink-3 hover:text-accent text-xs py-1 cursor-pointer">Xóa</button>
                  </li>
                ))}
              </ul>
              {addingTo === s.id ? (
                <div className="px-4 py-3 border-t border-border bg-bg-soft grid sm:grid-cols-2 gap-2">
                  <input className={inp} placeholder="Tên bài" value={lf.title} onChange={(e) => setLf({ ...lf, title: e.target.value })} />
                  <input className={inp} type="number" placeholder="Thời lượng (giây)" value={lf.duration} onChange={(e) => setLf({ ...lf, duration: e.target.value })} />
                  {!isPaid && <input className={`${inp} sm:col-span-2`} placeholder="Link YouTube (có thể gán sau)" value={lf.video} onChange={(e) => setLf({ ...lf, video: e.target.value })} />}
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
