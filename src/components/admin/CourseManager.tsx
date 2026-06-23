"use client";
import { useEffect, useState, useCallback } from "react";
import { formatVND } from "@/lib/format";
import { toast } from "@/components/Toaster";
import LessonManager from "./LessonManager";
import LiveSessionManager from "@/components/teach/LiveSessionManager";
import TestimonialManager from "@/components/teach/TestimonialManager";
import CourseCoverModal from "./CourseCoverModal";
import { slugify } from "@/lib/video";
import { compressImage } from "@/lib/image";

interface Faq { q: string; a: string }
interface Row { id: string; slug: string; title: string; category: string; level: string; price: number; compare_price?: number; students: number; status: string; source?: string; instructor?: string; subtitle?: string; description?: string; thumb?: string; assignment_title?: string; assignment_brief?: string; format?: string; capacity?: number | null; instructor_bio?: string; instructor_avatar?: string; guarantee?: string; faq?: Faq[]; }
type Form = Partial<Row> & { subtitle?: string; description?: string; compare_price?: number; thumb?: string; source?: string; assignment_title?: string; assignment_brief?: string; format?: string; capacity?: number | null; instructor_bio?: string; instructor_avatar?: string; guarantee?: string; faqText?: string };

const empty: Form = { title: "", slug: "", category: "Cơ bản", level: "beginner", price: 0, status: "published", format: "video" };
const parseFaq = (t: string): Faq[] => (t || "").split("\n").map((l) => { const i = l.indexOf("|"); return i < 0 ? null : { q: l.slice(0, i).trim(), a: l.slice(i + 1).trim() }; }).filter((x): x is Faq => !!x && !!x.q && !!x.a);
const faqToText = (f?: Faq[]) => (f || []).map((x) => `${x.q} | ${x.a}`).join("\n");

export default function CourseManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form | null>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [subBusy, setSubBusy] = useState(false);
  const [descBusy, setDescBusy] = useState(false);
  const [thumbBusy, setThumbBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // Đổi tên khóa → tự cập nhật slug (trừ khi người dùng đã sửa slug thủ công)
  function onTitle(v: string) {
    setForm((f) => f ? { ...f, title: v, ...(slugTouched ? {} : { slug: slugify(v) }) } : f);
  }
  function onSlug(v: string) { setSlugTouched(true); setForm((f) => f ? { ...f, slug: slugify(v) } : f); }
  function openNew() { setSlugTouched(false); setForm({ ...empty }); }
  function openEdit(f: Form) { setSlugTouched(true); setForm(f); }

  async function uploadThumb(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("Chỉ chấp nhận file ảnh (JPG/PNG/WebP)", "error");
    setThumbBusy(true);
    try {
      const small = await compressImage(file, 1600, 0.85);
      if (small.size > 4_000_000) { setThumbBusy(false); return toast("Ảnh quá lớn (>4MB sau khi nén). Hãy dùng ảnh nhỏ hơn.", "error"); }
      const fd = new FormData(); fd.append("file", small); fd.append("bucket", "blog");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        return toast(e.error || (res.status === 413 ? "Ảnh quá lớn" : `Lỗi tải ảnh (HTTP ${res.status})`), "error");
      }
      const r = await res.json();
      if (r.url) { setForm((f) => f ? { ...f, thumb: r.url } : f); toast("Đã tải ảnh bìa ✓"); }
      else toast(r.error || "Tải ảnh thất bại", "error");
    } catch (err) {
      toast("Lỗi xử lý ảnh: " + ((err as Error)?.message || "thử lại"), "error");
    } finally { setThumbBusy(false); }
  }

  async function aiSubtitle() {
    if (!form?.title?.trim()) return toast("Nhập tên khóa học trước đã", "error");
    setSubBusy(true);
    const r = await fetch("/api/admin/course-suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.title }) }).then((x) => x.json()).catch(() => ({}));
    setSubBusy(false);
    if (r.subtitle) { setForm((f) => f ? { ...f, subtitle: r.subtitle } : f); toast("✨ Đã gợi ý mô tả"); }
    else toast(r.error || "Không gợi ý được", "error");
  }
  async function aiDescription() {
    if (!form?.title?.trim()) return toast("Nhập tên khóa học trước đã", "error");
    setDescBusy(true);
    const r = await fetch("/api/admin/course-suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.title, field: "description" }) }).then((x) => x.json()).catch(() => ({}));
    setDescBusy(false);
    if (r.description) { setForm((f) => f ? { ...f, description: r.description } : f); toast("✨ Đã viết mô tả chi tiết"); }
    else toast(r.error || "Không gợi ý được", "error");
  }
  async function aiBeautify() {
    if (!form?.description?.trim()) return toast("Hãy nhập nội dung mô tả trước", "error");
    setDescBusy(true);
    const r = await fetch("/api/admin/course-suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.title, field: "beautify", text: form.description }) }).then((x) => x.json()).catch(() => ({}));
    setDescBusy(false);
    if (r.description) { setForm((f) => f ? { ...f, description: r.description } : f); toast("✨ Đã làm đẹp nội dung"); }
    else toast(r.error || "Không xử lý được", "error");
  }
  const [managing, setManaging] = useState<Row | null>(null);
  const [testimonialFor, setTestimonialFor] = useState<Row | null>(null);

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
    const m = r.ok ? `Đã nạp ${r.inserted} khóa.` : r.message || r.error || "Lỗi";
    setMsg(m); toast(m, r.ok ? "success" : "info");
    load();
  }

  async function save() {
    if (!form?.title || !form?.slug) { setMsg("Cần nhập tên + slug"); return toast("Cần nhập tên + slug", "error"); }
    const method = form.id ? "PATCH" : "POST";
    const r = await fetch("/api/admin/courses", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, faq: parseFaq(form.faqText || "") }),
    }).then((x) => x.json());
    if (r.ok) { setForm(null); setMsg("Đã lưu."); toast("Đã lưu khóa học"); load(); } else { setMsg(r.error || "Lỗi lưu"); toast(r.error || "Lưu thất bại", "error"); }
  }

  async function del(id: string) {
    if (!confirm("Xóa khóa học này?")) return;
    await fetch(`/api/admin/courses?id=${id}`, { method: "DELETE" });
    toast("Đã xóa khóa học");
    load();
  }

  async function aiSeo() {
    if (!confirm("AI sẽ tự tạo tiêu đề & mô tả SEO cho các khóa chưa có. Tiếp tục?")) return;
    toast("✨ AI đang tối ưu SEO… (~20s)", "info");
    const r = await fetch("/api/admin/seo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).then((x) => x.json()).catch(() => ({}));
    toast(r.skipped ? r.skipped : r.updated != null ? `✓ Đã tối ưu SEO ${r.updated} khóa` : r.error || "Lỗi", r.updated ? "success" : "info");
  }

  const inp = "w-full px-3 py-2 rounded-lg border border-border-strong bg-surface text-sm outline-none focus:border-accent";

  return (
    <div>
      {coverOpen && form && <CourseCoverModal title={form.title || ""} onClose={() => setCoverOpen(false)} onUse={(url) => setForm((f) => f ? { ...f, thumb: url } : f)} />}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h2 className="font-bold text-lg">Quản lý khóa học {rows.length > 0 && <span className="text-ink-3 font-normal">({rows.length})</span>}</h2>
        <div className="flex gap-2">
          {rows.length === 0 && !loading && (
            <button onClick={seed} className="rounded-full border border-border-strong hover:border-accent text-sm font-semibold px-4 py-2 cursor-pointer">⬇ Nạp dữ liệu mẫu</button>
          )}
          {rows.length > 0 && (
            <button onClick={aiSeo} className="rounded-full border border-border-strong hover:border-accent hover:text-accent text-sm font-semibold px-4 py-2 cursor-pointer transition-colors">✨ AI tối ưu SEO</button>
          )}
          <button onClick={openNew} className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold text-sm px-4 py-2 cursor-pointer transition-colors">+ Thêm khóa học</button>
        </div>
      </div>
      {msg && <p className="text-sm text-ink-2 mb-3">{msg}</p>}

      {form && (
        <div className="rounded-card border border-border bg-bg-soft p-5 mb-4 grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 flex gap-2">
            <input className={`${inp} flex-1`} placeholder="Tên khóa học" value={form.title || ""} onChange={(e) => onTitle(e.target.value)} />
            <button onClick={() => form?.title?.trim() ? setCoverOpen(true) : toast("Nhập tên khóa học trước đã", "error")} title="Tạo ảnh bìa bằng AI dựa trên tên khóa" className="shrink-0 rounded-lg bg-ink text-white font-semibold text-sm px-3.5 py-2 cursor-pointer hover:opacity-90 whitespace-nowrap">
              ✨ Tạo ảnh bìa AI
            </button>
          </div>

          {/* Loại khóa: Video quay sẵn / Live Google Meet */}
          <div className="sm:col-span-2 flex gap-2">
            <button onClick={() => setForm({ ...form, format: "video" })} className={`flex-1 rounded-lg border py-2 text-sm font-semibold cursor-pointer transition-colors ${(form.format ?? "video") === "video" ? "border-accent bg-accent-weak text-accent" : "border-border-strong hover:border-accent"}`}>🎬 Video quay sẵn</button>
            <button onClick={() => setForm({ ...form, format: "live" })} className={`flex-1 rounded-lg border py-2 text-sm font-semibold cursor-pointer transition-colors ${form.format === "live" ? "border-accent bg-accent-weak text-accent" : "border-border-strong hover:border-accent"}`}>🔴 Live (Google Meet)</button>
          </div>

          {/* Phân loại phí ngay từ đầu */}
          <div className="sm:col-span-2 flex gap-2">
            <button onClick={() => setForm({ ...form, price: 0, compare_price: 0 })} className={`flex-1 rounded-lg border py-2 text-sm font-semibold cursor-pointer transition-colors ${(form.price ?? 0) === 0 ? "border-success bg-success/10 text-success" : "border-border-strong hover:border-accent"}`}>🆓 Miễn phí</button>
            <button onClick={() => setForm({ ...form, price: form.price && form.price > 0 ? form.price : 299000 })} className={`flex-1 rounded-lg border py-2 text-sm font-semibold cursor-pointer transition-colors ${(form.price ?? 0) > 0 ? "border-accent bg-accent-weak text-accent" : "border-border-strong hover:border-accent"}`}>💳 Có phí</button>
          </div>

          {form.format === "live" && (
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-ink-2">Sức chứa lớp (số chỗ tối đa — để trống = không giới hạn)</label>
              <input className={`${inp} mt-1`} type="number" placeholder="vd 30" value={form.capacity ?? ""} onChange={(e) => setForm({ ...form, capacity: e.target.value === "" ? null : Number(e.target.value) })} />
              <p className="text-ink-3 text-[11px] mt-1">🔴 Khóa Live: lưu xong bấm <b>“Buổi học”</b> ở danh sách để thêm lịch buổi (link Meet tự sinh nếu đã kết nối Google).</p>
            </div>
          )}

          {form.thumb && (
            <div className="sm:col-span-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.thumb} alt="Ảnh bìa" className="w-full max-w-[280px] aspect-video object-cover rounded-lg border border-border" />
            </div>
          )}
          <input className={inp} placeholder="slug — tự tạo từ tên" value={form.slug || ""} onChange={(e) => onSlug(e.target.value)} />
          <input className={inp} placeholder="Danh mục" value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <div className="sm:col-span-2 flex gap-2">
            <input className={`${inp} flex-1`} placeholder="Mô tả ngắn (subtitle)" value={form.subtitle || ""} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            <button onClick={aiSubtitle} disabled={subBusy} title="AI gợi ý mô tả từ tên khóa" className="shrink-0 rounded-lg border border-border-strong hover:border-accent text-sm font-semibold px-3 cursor-pointer disabled:opacity-60 whitespace-nowrap">{subBusy ? "…" : "✨ AI gợi ý"}</button>
          </div>
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-ink-2">Mô tả (chi tiết) — hiển thị ở mục “Mô tả” trang khóa</label>
              <div className="flex gap-3">
                <button onClick={aiDescription} disabled={descBusy} title="AI viết mô tả mới từ tên khóa" className="text-xs font-semibold text-accent hover:underline cursor-pointer disabled:opacity-60 whitespace-nowrap">{descBusy ? "Đang xử lý…" : "✨ AI viết mới"}</button>
                <button onClick={aiBeautify} disabled={descBusy} title="AI làm đẹp/chuẩn hóa nội dung bạn đã nhập" className="text-xs font-semibold text-accent hover:underline cursor-pointer disabled:opacity-60 whitespace-nowrap">🪄 Làm đẹp</button>
              </div>
            </div>
            <textarea className={`${inp} min-h-[140px] resize-y`} placeholder="Mô tả chi tiết: dạy gì, đạt được gì, phù hợp với ai… (hỗ trợ Markdown: ## tiêu đề, - gạch đầu dòng, **in đậm**). Bấm 🪄 Làm đẹp để AI tự bố cục lại." value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <p className="text-ink-3 text-[11px] mt-1">Mẹo: nhập ý thô rồi bấm <b>🪄 Làm đẹp</b> để AI tự chia mục, thêm tiêu đề & gạch đầu dòng.</p>
          </div>
          <div className="sm:col-span-2 border-t border-border pt-3">
            <label className="text-xs font-semibold text-ink-2">📝 Bài tập / Dự án thực hành (AI chấm điểm) — để trống nếu không có</label>
            <input className={`${inp} mt-1.5`} placeholder="Tên bài tập (vd: Dự án: Tự động hóa công việc bằng AI)" value={form.assignment_title || ""} onChange={(e) => setForm({ ...form, assignment_title: e.target.value })} />
            <textarea className={`${inp} min-h-[100px] resize-y mt-2`} placeholder="Đề bài / yêu cầu: học viên cần làm gì, nộp gì, tiêu chí đạt… AI sẽ dựa vào đây để chấm & nhận xét." value={form.assignment_brief || ""} onChange={(e) => setForm({ ...form, assignment_brief: e.target.value })} />
          </div>
          {(form.price ?? 0) > 0 && (
            <>
              <input className={inp} type="number" placeholder="Giá (VND)" value={form.price ?? ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              <input className={inp} type="number" placeholder="Giá gạch (tùy chọn)" value={form.compare_price ?? ""} onChange={(e) => setForm({ ...form, compare_price: Number(e.target.value) })} />
            </>
          )}
          <select className={inp} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
            <option value="beginner">Cơ bản</option><option value="intermediate">Trung cấp</option><option value="advanced">Nâng cao</option>
          </select>
          <select className={inp} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="published">Công khai</option><option value="draft">Nháp</option>
          </select>
          <input className={inp} placeholder="Giảng viên (điền thủ công — khóa Bunny)" value={form.instructor || ""} onChange={(e) => setForm({ ...form, instructor: e.target.value })} />
          <input className={inp} placeholder="Nguồn / Tên kênh (tự điền nếu dùng YouTube)" value={form.source || ""} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          <div className="sm:col-span-2">
            <div className="flex gap-2">
              <input className={`${inp} flex-1`} placeholder="Ảnh bìa (URL) — hoặc tải lên / tạo bằng AI" value={form.thumb || ""} onChange={(e) => setForm({ ...form, thumb: e.target.value })} />
              <label className="shrink-0 rounded-lg border border-border-strong hover:border-accent text-sm font-semibold px-3.5 py-2 cursor-pointer whitespace-nowrap inline-flex items-center">
                {thumbBusy ? "Đang tải…" : "⬆ Tải ảnh"}
                <input type="file" accept="image/*" className="hidden" disabled={thumbBusy} onChange={(e) => { uploadThumb(e.target.files?.[0]); e.currentTarget.value = ""; }} />
              </label>
            </div>
            <p className="text-ink-3 text-xs mt-1">Khuyến nghị tỉ lệ <b>16:9</b> — kích thước <b>1280×720</b> (hoặc 1920×1080). Ảnh tự nén tối ưu khi tải lên.</p>
          </div>

          {/* Marketing / bán hàng (tăng chuyển đổi trang khóa) */}
          <details className="sm:col-span-2 border border-border rounded-lg p-3 bg-surface">
            <summary className="text-sm font-semibold cursor-pointer">🚀 Marketing / bán hàng — giảng viên, cam kết, FAQ (tùy chọn)</summary>
            <div className="space-y-2 mt-3">
              <input className={inp} placeholder="Ảnh đại diện giảng viên (URL)" value={form.instructor_avatar || ""} onChange={(e) => setForm({ ...form, instructor_avatar: e.target.value })} />
              <textarea className={inp} rows={2} placeholder="Giới thiệu giảng viên (kinh nghiệm, thành tích…)" value={form.instructor_bio || ""} onChange={(e) => setForm({ ...form, instructor_bio: e.target.value })} />
              <textarea className={inp} rows={2} placeholder="Cam kết/đảm bảo — để trống dùng mặc định" value={form.guarantee || ""} onChange={(e) => setForm({ ...form, guarantee: e.target.value })} />
              <div>
                <label className="block text-[11px] text-ink-3 mb-1">FAQ — mỗi dòng: <code className="bg-bg-soft px-1 rounded">Câu hỏi | Trả lời</code> (để trống dùng FAQ mặc định)</label>
                <textarea className={`${inp} font-mono`} rows={3} placeholder={"Tôi mới bắt đầu học được không? | Được, khóa phù hợp người mới...\nLỡ buổi thì sao? | Có bản ghi xem lại..."} value={form.faqText || ""} onChange={(e) => setForm({ ...form, faqText: e.target.value })} />
              </div>
              <p className="text-[11px] text-ink-3">Đánh giá học viên: lưu khóa xong, bấm nút <b>★ Đánh giá</b> ở danh sách bên dưới.</p>
            </div>
          </details>

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
                  <button onClick={() => setManaging(c)} className="text-ink-2 font-semibold cursor-pointer hover:text-ink mr-3">{c.format === "live" ? "Buổi học" : "Bài học"}</button>
                  <button onClick={() => setTestimonialFor(c)} className="text-ink-2 font-semibold cursor-pointer hover:text-ink mr-3">★ Đánh giá</button>
                  <button onClick={() => openEdit({ id: c.id, title: c.title, slug: c.slug, category: c.category, level: c.level, price: c.price, compare_price: c.compare_price, status: c.status, source: c.source, subtitle: c.subtitle, description: c.description, instructor: c.instructor, assignment_title: c.assignment_title, assignment_brief: c.assignment_brief, format: c.format, capacity: c.capacity, instructor_bio: c.instructor_bio, instructor_avatar: c.instructor_avatar, guarantee: c.guarantee, faqText: faqToText(c.faq) })} className="text-accent font-semibold cursor-pointer hover:underline mr-3">Sửa</button>
                  <button onClick={() => del(c.id)} className="text-ink-3 font-semibold cursor-pointer hover:text-accent">Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {managing && (managing.format === "live"
        ? <LiveSessionManager courseId={managing.id} onClose={() => setManaging(null)} />
        : <LessonManager courseId={managing.id} onClose={() => setManaging(null)} />)}
      {testimonialFor && <TestimonialManager courseId={testimonialFor.id} onClose={() => setTestimonialFor(null)} />}
    </div>
  );
}
