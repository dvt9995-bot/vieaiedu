"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "@/components/Toaster";

interface T { id: string; name: string; role: string | null; content: string; rating: number; avatar_url: string | null; }

// Nhập "đánh giá nổi bật" (social proof) cho khóa — hiển thị trên trang bán hàng.
export default function TestimonialManager({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const [list, setList] = useState<T[]>([]);
  const [f, setF] = useState({ name: "", role: "", content: "", rating: "5", avatar_url: "" });

  const load = useCallback(async () => {
    const r = await fetch(`/api/instructor/testimonials?course_id=${courseId}`).then((x) => x.json()).catch(() => ({}));
    setList(r.testimonials || []);
  }, [courseId]);
  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!f.name.trim() || !f.content.trim()) return toast("Nhập tên và nội dung đánh giá");
    const res = await fetch("/api/instructor/testimonials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ course_id: courseId, ...f, rating: Number(f.rating) || 5, position: list.length }) });
    const d = await res.json();
    if (!res.ok) return toast(d.error || "Lỗi lưu");
    toast("Đã thêm đánh giá"); setF({ name: "", role: "", content: "", rating: "5", avatar_url: "" }); load();
  }
  async function del(id: string) { await fetch(`/api/instructor/testimonials?id=${id}`, { method: "DELETE" }); toast("Đã xóa"); load(); }

  const inp = "px-3 py-2 rounded-lg border border-border-strong bg-surface text-sm outline-none focus:border-accent";
  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-[rgba(11,12,14,.5)] backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface rounded-card border border-border shadow-lg w-full max-w-[600px] max-h-[85vh] overflow-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface">
          <h3 className="font-bold text-lg">★ Đánh giá nổi bật</h3>
          <button onClick={onClose} className="text-ink-3 hover:text-ink text-2xl leading-none cursor-pointer">×</button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-ink-3">Đánh giá thật của học viên (≥4★) tự hiển thị. Tại đây bạn thêm các đánh giá nổi bật để tăng tin cậy.</p>
          {list.map((t) => (
            <div key={t.id} className="border border-border rounded-lg p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-gold text-xs">{"★".repeat(Math.min(5, t.rating))}</div>
                <p className="text-sm text-ink-2 mt-0.5">“{t.content}”</p>
                <div className="text-xs text-ink-3 mt-1">{t.name}{t.role ? ` · ${t.role}` : ""}</div>
              </div>
              <button onClick={() => del(t.id)} className="text-xs text-ink-3 hover:text-accent cursor-pointer shrink-0">Xóa</button>
            </div>
          ))}
          <div className="border border-border rounded-lg p-3 bg-bg-soft grid sm:grid-cols-2 gap-2">
            <input className={inp} placeholder="Tên học viên" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <input className={inp} placeholder="Vai trò (vd: Chủ shop online)" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} />
            <textarea className={`${inp} sm:col-span-2`} rows={2} placeholder="Nội dung cảm nhận" value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} />
            <select className={inp} value={f.rating} onChange={(e) => setF({ ...f, rating: e.target.value })}>{[5, 4, 3].map((n) => <option key={n} value={n}>{n} sao</option>)}</select>
            <input className={inp} placeholder="Ảnh đại diện (URL — tùy chọn)" value={f.avatar_url} onChange={(e) => setF({ ...f, avatar_url: e.target.value })} />
            <button onClick={add} className="sm:col-span-2 rounded-full bg-accent hover:bg-accent-700 text-white text-sm font-semibold py-2 cursor-pointer">+ Thêm đánh giá</button>
          </div>
        </div>
      </div>
    </div>
  );
}
