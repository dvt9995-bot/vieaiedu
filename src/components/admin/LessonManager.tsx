"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "@/components/Toaster";
import { normalizeVideoInput } from "@/lib/video";

interface Lesson { id: string; title: string; duration_sec: number; is_preview: boolean; video_id: string | null; content?: string | null; }
interface Section { id: string; title: string; lessons: Lesson[]; }

export default function LessonManager({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [newSection, setNewSection] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [lf, setLf] = useState({ title: "", duration: "300", preview: false, video: "" });
  const [docLesson, setDocLesson] = useState<Lesson | null>(null);
  const [docText, setDocText] = useState("");

  async function saveDoc() {
    if (!docLesson) return;
    await fetch("/api/admin/lessons", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: docLesson.id, content: docText || null }) });
    setDocLesson(null); toast("Đã lưu tài liệu bài học"); load();
  }

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/lessons?course_id=${courseId}`).then((x) => x.json());
    setSections(r.sections || []);
  }, [courseId]);
  useEffect(() => { load(); }, [load]);

  async function addSection() {
    if (!newSection.trim()) return;
    await fetch("/api/admin/sections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ course_id: courseId, title: newSection, position: sections.length }) });
    setNewSection(""); toast("Đã thêm chương"); load();
  }
  async function delSection(id: string) { if (confirm("Xóa chương (và toàn bộ bài trong đó)?")) { await fetch(`/api/admin/sections?id=${id}`, { method: "DELETE" }); toast("Đã xóa chương"); load(); } }

  async function addLesson(sectionId: string, count: number) {
    if (!lf.title.trim()) return;
    await fetch("/api/admin/lessons", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section_id: sectionId, course_id: courseId, title: lf.title, duration_sec: Number(lf.duration) || 0, is_preview: lf.preview, video_id: normalizeVideoInput(lf.video), position: count }),
    });
    setLf({ title: "", duration: "300", preview: false, video: "" }); setAddingTo(null); toast("Đã thêm bài học"); load();
  }
  async function delLesson(id: string) { await fetch(`/api/admin/lessons?id=${id}`, { method: "DELETE" }); toast("Đã xóa bài học"); load(); }
  async function togglePreview(l: Lesson) {
    await fetch("/api/admin/lessons", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: l.id, is_preview: !l.is_preview }) });
    load();
  }
  async function setVideo(l: Lesson) {
    const cur = l.video_id?.startsWith("yt:") ? `https://youtu.be/${l.video_id.slice(3)}` : (l.video_id || "");
    const v = prompt("Dán link YouTube (hoặc Bunny video ID) cho bài này:", cur);
    if (v === null) return;
    await fetch("/api/admin/lessons", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: l.id, video_id: normalizeVideoInput(v) }) });
    toast(v.trim() ? "Đã gán video cho bài học" : "Đã gỡ video");
    load();
  }

  const inp = "px-3 py-2 rounded-lg border border-border-strong bg-surface text-sm outline-none focus:border-accent";

  if (docLesson) return (
    <div className="fixed inset-0 z-[270] flex items-center justify-center p-4 bg-[rgba(11,12,14,.55)] backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setDocLesson(null)}>
      <div className="bg-surface rounded-card border border-border shadow-lg w-full max-w-[640px] max-h-[88vh] overflow-auto p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg">📄 Tài liệu bài: {docLesson.title}</h3>
          <button onClick={() => setDocLesson(null)} className="text-ink-3 hover:text-ink text-2xl leading-none cursor-pointer">×</button>
        </div>
        <p className="text-ink-3 text-xs mb-3">Hỗ trợ Markdown. Thêm liên kết tải tài liệu: <code className="bg-bg-soft px-1 rounded">[Tải PDF](https://link...)</code>. Tiêu đề: <code className="bg-bg-soft px-1 rounded">## Mục</code>, gạch đầu dòng: <code className="bg-bg-soft px-1 rounded">- ý</code>.</p>
        <textarea value={docText} onChange={(e) => setDocText(e.target.value)} rows={12} placeholder={"## Tài liệu bài học\n\n- [Slide bài giảng (PDF)](https://...)\n- [Mã nguồn mẫu](https://github.com/...)\n\nGhi chú thêm cho học viên..."} className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm font-mono outline-none focus:border-accent" />
        <div className="flex gap-2 mt-3">
          <button onClick={saveDoc} className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold text-sm px-5 py-2 cursor-pointer">Lưu tài liệu</button>
          <button onClick={() => setDocLesson(null)} className="rounded-full border border-border-strong text-sm px-4 py-2 cursor-pointer">Hủy</button>
        </div>
      </div>
    </div>
  );

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
                  <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 border-t border-border text-sm">
                    <span className="basis-full sm:basis-auto sm:flex-1 min-w-0">{l.title} <span className="text-ink-3 text-xs">({Math.round(l.duration_sec / 60)}p)</span></span>
                    <button onClick={() => togglePreview(l)} className={`text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer ${l.is_preview ? "bg-accent-weak text-accent" : "text-ink-3 border border-border"}`}>{l.is_preview ? "Xem thử" : "Khóa"}</button>
                    <button onClick={() => setVideo(l)} className={`text-xs font-semibold py-1 cursor-pointer ${l.video_id ? "text-success" : "text-accent"}`}>{l.video_id ? "🎬 đã gán" : "Gán video"}</button>
                    <button onClick={() => { setDocLesson(l); setDocText(l.content || ""); }} className={`text-xs font-semibold py-1 cursor-pointer ${l.content ? "text-success" : "text-ink-2 hover:text-accent"}`}>{l.content ? "📄 có tài liệu" : "📄 Tài liệu"}</button>
                    <button onClick={() => delLesson(l.id)} className="text-ink-3 hover:text-accent text-xs py-1 cursor-pointer">Xóa</button>
                  </li>
                ))}
              </ul>
              {addingTo === s.id ? (
                <div className="px-4 py-3 border-t border-border bg-bg-soft grid sm:grid-cols-2 gap-2">
                  <input className={inp} placeholder="Tên bài" value={lf.title} onChange={(e) => setLf({ ...lf, title: e.target.value })} />
                  <input className={inp} type="number" placeholder="Thời lượng (giây)" value={lf.duration} onChange={(e) => setLf({ ...lf, duration: e.target.value })} />
                  <input className={`${inp} sm:col-span-2`} placeholder="Link YouTube hoặc Bunny video ID (tùy chọn)" value={lf.video} onChange={(e) => setLf({ ...lf, video: e.target.value })} />
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
