"use client";
import { useEffect, useState, useCallback } from "react";
import { formatVND } from "@/lib/format";

interface Row { id: string; slug: string; title: string; category: string; level: string; price: number; students: number; status: string; }
type Form = Partial<Row> & { subtitle?: string; description?: string; compare_price?: number; thumb?: string };

const empty: Form = { title: "", slug: "", category: "Cơ bản", level: "beginner", price: 0, status: "published" };

export default function CourseManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/courses").then((x) => x.json()).catch(() => ({ courses: [] }));
    setRows(r.courses || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function seed() {
    setMsg("Đang nạp dữ liệu mẫu…");
    const r = await fetch("/api/admin/seed-courses", { method: "POST" }).then((x) => x.json());
    setMsg(r.ok ? `Đã nạp ${r.inserted} khóa.` : r.message || r.error || "Lỗi");
    load();
  }

  async function save() {
    if (!form?.title || !form?.slug) { setMsg("Cần nhập tên + slug"); return; }
    const method = form.id ? "PATCH" : "POST";
    const r = await fetch("/api/admin/courses", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    }).then((x) => x.json());
    if (r.ok) { setForm(null); setMsg("Đã lưu."); load(); } else setMsg(r.error || "Lỗi lưu");
  }

  async function del(id: string) {
    if (!confirm("Xóa khóa học này?")) return;
    await fetch(`/api/admin/courses?id=${id}`, { method: "DELETE" });
    load();
  }

  const inp = "w-full px-3 py-2 rounded-lg border border-border-strong bg-surface text-sm outline-none focus:border-accent";

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h2 className="font-bold text-lg">Quản lý khóa học {rows.length > 0 && <span className="text-ink-3 font-normal">({rows.length})</span>}</h2>
        <div className="flex gap-2">
          {rows.length === 0 && !loading && (
            <button onClick={seed} className="rounded-full border border-border-strong hover:border-accent text-sm font-semibold px-4 py-2 cursor-pointer">⬇ Nạp dữ liệu mẫu</button>
          )}
          <button onClick={() => setForm({ ...empty })} className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold text-sm px-4 py-2 cursor-pointer transition-colors">+ Thêm khóa học</button>
        </div>
      </div>
      {msg && <p className="text-sm text-ink-2 mb-3">{msg}</p>}

      {form && (
        <div className="rounded-card border border-border bg-bg-soft p-5 mb-4 grid sm:grid-cols-2 gap-3">
          <input className={inp} placeholder="Tên khóa học" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className={inp} placeholder="slug (vd: nhap-mon-ai)" value={form.slug || ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <input className={inp} placeholder="Mô tả ngắn (subtitle)" value={form.subtitle || ""} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          <input className={inp} placeholder="Danh mục" value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input className={inp} type="number" placeholder="Giá (VND)" value={form.price ?? ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          <input className={inp} type="number" placeholder="Giá gạch (tùy chọn)" value={form.compare_price ?? ""} onChange={(e) => setForm({ ...form, compare_price: Number(e.target.value) })} />
          <select className={inp} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
            <option value="beginner">Cơ bản</option><option value="intermediate">Trung cấp</option><option value="advanced">Nâng cao</option>
          </select>
          <select className={inp} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="published">Công khai</option><option value="draft">Nháp</option>
          </select>
          <input className={`${inp} sm:col-span-2`} placeholder="Ảnh thumbnail (URL, vd /courses/abc.jpg)" value={form.thumb || ""} onChange={(e) => setForm({ ...form, thumb: e.target.value })} />
          <div className="sm:col-span-2 flex gap-2">
            <button onClick={save} className="rounded-full bg-ink text-white font-semibold text-sm px-4 py-2 cursor-pointer">Lưu khóa học</button>
            <button onClick={() => setForm(null)} className="rounded-full border border-border-strong text-sm px-4 py-2 cursor-pointer">Hủy</button>
          </div>
        </div>
      )}

      <div className="rounded-card border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-bg-soft text-ink-3 text-left text-xs uppercase tracking-wide">
            <th className="px-4 py-3 font-semibold">Khóa học</th><th className="px-4 py-3 font-semibold">Giá</th><th className="px-4 py-3 font-semibold hidden sm:table-cell">Trạng thái</th><th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-3">Đang tải…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-3">Chưa có khóa học. Bấm &quot;Nạp dữ liệu mẫu&quot; hoặc &quot;Thêm khóa học&quot;.</td></tr>
            ) : rows.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{c.title}<div className="text-ink-3 text-xs font-normal">/{c.slug}</div></td>
                <td className="px-4 py-3">{formatVND(c.price)}</td>
                <td className="px-4 py-3 hidden sm:table-cell"><span className={`text-xs font-semibold ${c.status === "published" ? "text-success" : "text-ink-3"}`}>{c.status === "published" ? "Công khai" : "Nháp"}</span></td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => setForm({ id: c.id, title: c.title, slug: c.slug, category: c.category, level: c.level, price: c.price, status: c.status })} className="text-accent font-semibold cursor-pointer hover:underline mr-3">Sửa</button>
                  <button onClick={() => del(c.id)} className="text-ink-3 font-semibold cursor-pointer hover:text-accent">Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
