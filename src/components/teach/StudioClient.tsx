"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "@/components/Toaster";
import { formatVND } from "@/lib/format";
import { compressImage } from "@/lib/image";
import TeachLessonManager from "./TeachLessonManager";
import LiveSessionManager from "./LiveSessionManager";
import TestimonialManager from "./TestimonialManager";

interface Faq { q: string; a: string }
interface App { status: string; admin_note?: string | null }
interface Course { id: string; slug: string; title: string; subtitle?: string; description?: string; price: number; compare_price?: number; status: string; review_status: string; review_note?: string | null; total_minutes: number; thumb?: string; category?: string; level?: string; format?: string; capacity?: number | null; instructor_bio?: string; instructor_avatar?: string; guarantee?: string; faq?: Faq[] }

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Nháp", cls: "bg-bg-soft text-ink-2" },
  pending: { label: "Chờ duyệt", cls: "bg-gold/15 text-amber-700" },
  approved: { label: "Đã duyệt · công khai", cls: "bg-success/15 text-success" },
  rejected: { label: "Cần chỉnh sửa", cls: "bg-accent-weak text-accent" },
};
const inp = "w-full px-3 py-2.5 rounded-lg border border-border-strong bg-surface text-sm outline-none focus:border-accent";
const empty = { title: "", subtitle: "", description: "", price: "0", compare_price: "", category: "", level: "Cơ bản", thumb: "", format: "video", capacity: "", instructor_bio: "", instructor_avatar: "", guarantee: "", faqText: "" };
// Chuyển textarea "Câu hỏi | Trả lời" mỗi dòng ⇄ mảng [{q,a}]
const parseFaq = (t: string): Faq[] => t.split("\n").map((l) => { const i = l.indexOf("|"); return i < 0 ? null : { q: l.slice(0, i).trim(), a: l.slice(i + 1).trim() }; }).filter((x): x is Faq => !!x && !!x.q && !!x.a);
const faqToText = (f?: Faq[]) => (f || []).map((x) => `${x.q} | ${x.a}`).join("\n");

export default function StudioClient() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("student");
  const [app, setApp] = useState<App | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState(empty);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [managing, setManaging] = useState<Course | null>(null);
  const [testimonialFor, setTestimonialFor] = useState<Course | null>(null);
  const [applyForm, setApplyForm] = useState({ full_name: "", expertise: "", bio: "", sample_links: "", motivation: "", agree_terms: false });
  const [subBusy, setSubBusy] = useState(false);
  const [descBusy, setDescBusy] = useState(false);
  const [thumbBusy, setThumbBusy] = useState(false);

  const isInstructor = role === "instructor" || role === "admin";

  async function uploadThumb(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("Chỉ chấp nhận file ảnh (JPG/PNG/WebP)");
    setThumbBusy(true);
    try {
      const small = await compressImage(file, 1600, 0.85);
      if (small.size > 4_000_000) return toast("Ảnh quá lớn (>4MB sau khi nén)");
      const fd = new FormData(); fd.append("file", small); fd.append("bucket", "blog");
      const res = await fetch("/api/instructor/upload", { method: "POST", body: fd });
      const r = await res.json().catch(() => ({}));
      if (res.ok && r.url) { setForm((f) => ({ ...f, thumb: r.url })); toast("Đã tải ảnh bìa ✓"); }
      else toast(r.error || "Tải ảnh thất bại");
    } catch (e) { toast("Lỗi xử lý ảnh: " + ((e as Error)?.message || "thử lại")); }
    finally { setThumbBusy(false); }
  }
  async function aiSuggest(field: "subtitle" | "description" | "beautify") {
    if (!form.title.trim()) return toast("Nhập tên khóa học trước đã");
    if (field === "beautify" && !form.description.trim()) return toast("Hãy nhập nội dung mô tả trước");
    field === "subtitle" ? setSubBusy(true) : setDescBusy(true);
    const r = await fetch("/api/instructor/course-suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.title, field, text: form.description }) }).then((x) => x.json()).catch(() => ({}));
    setSubBusy(false); setDescBusy(false);
    if (r.subtitle) { setForm((f) => ({ ...f, subtitle: r.subtitle })); toast("✨ Đã gợi ý mô tả ngắn"); }
    else if (r.description) { setForm((f) => ({ ...f, description: r.description })); toast(field === "beautify" ? "✨ Đã làm đẹp nội dung" : "✨ Đã viết mô tả chi tiết"); }
    else toast(r.error || "AI chưa xử lý được");
  }

  const loadCourses = useCallback(async () => {
    const r = await fetch("/api/instructor/courses").then((x) => x.json()).catch(() => ({}));
    setCourses(r.courses || []);
  }, []);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/instructor/apply").then((x) => x.json()).catch(() => ({}));
      setRole(r.role || "student"); setApp(r.application || null);
      if (r.role === "instructor" || r.role === "admin") await loadCourses();
      setLoading(false);
    })();
  }, [loadCourses]);

  async function submitApply() {
    if (!applyForm.agree_terms) return toast("Vui lòng đồng ý cam kết bản quyền");
    const res = await fetch("/api/instructor/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(applyForm) });
    const d = await res.json();
    if (!res.ok) return toast(d.error || "Lỗi gửi đơn");
    toast("Đã gửi đơn — chờ quản trị viên duyệt"); setApp({ status: "pending" });
  }

  async function saveCourse() {
    if (!form.title.trim()) return toast("Nhập tiêu đề khóa học");
    const method = editId ? "PATCH" : "POST";
    const body = { ...form, faq: parseFaq(form.faqText), ...(editId ? { id: editId } : {}) };
    const res = await fetch("/api/instructor/courses", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json();
    if (!res.ok) return toast(d.error || "Lỗi lưu khóa");
    toast(editId ? "Đã lưu khóa học" : "Đã tạo khóa học (nháp)"); setCreating(false); setEditId(null); setForm(empty); loadCourses();
  }
  function openEdit(c: Course) { setEditId(c.id); setForm({ title: c.title, subtitle: c.subtitle || "", description: c.description || "", price: String(c.price || 0), compare_price: c.compare_price ? String(c.compare_price) : "", category: c.category || "", level: c.level || "Cơ bản", thumb: c.thumb || "", format: c.format || "video", capacity: c.capacity ? String(c.capacity) : "", instructor_bio: c.instructor_bio || "", instructor_avatar: c.instructor_avatar || "", guarantee: c.guarantee || "", faqText: faqToText(c.faq) }); setCreating(true); }
  async function submitReview(c: Course) {
    const res = await fetch("/api/instructor/courses", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, action: "submit" }) });
    const d = await res.json();
    if (!res.ok) return toast(d.error || "Chưa thể gửi duyệt");
    toast("Đã gửi duyệt — chờ quản trị viên xét duyệt"); loadCourses();
  }
  async function delCourse(c: Course) { if (!confirm(`Xóa khóa "${c.title}"?`)) return; await fetch(`/api/instructor/courses?id=${c.id}`, { method: "DELETE" }); toast("Đã xóa"); loadCourses(); }

  if (loading) return <div className="container-x py-20 text-center text-ink-3">Đang tải…</div>;

  // ===== Chưa là giảng viên =====
  if (!isInstructor) {
    if (app?.status === "pending") return (
      <div className="container-x py-16 max-w-xl text-center">
        <div className="text-5xl mb-3">⏳</div>
        <h1 className="text-2xl font-extrabold">Đơn đang chờ duyệt</h1>
        <p className="text-ink-2 mt-2">Quản trị viên sẽ xem xét hồ sơ giảng viên của bạn và phản hồi sớm. Bạn sẽ nhận được thông báo khi có kết quả.</p>
        <Link href="/dashboard" className="inline-block mt-6 rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold">Về trang cá nhân</Link>
      </div>
    );
    return (
      <div className="container-x py-12 max-w-xl">
        <div className="text-xs uppercase tracking-wider text-accent font-semibold">Chương trình Giảng viên</div>
        <h1 className="text-3xl font-extrabold tracking-tight mt-1">Trở thành Giảng viên</h1>
        <p className="text-ink-2 mt-2">Chia sẻ kiến thức của bạn — đăng khóa học miễn phí hoặc thu phí. Đăng ký để quản trị viên xét duyệt; sau khi được duyệt bạn có thể tạo khóa và đăng video ngay trên hệ thống.</p>
        {app?.status === "rejected" && <div className="mt-4 rounded-lg bg-accent-weak text-accent text-sm p-3">Đơn trước chưa được duyệt{app.admin_note ? `: ${app.admin_note}` : ""}. Bạn có thể bổ sung và gửi lại.</div>}
        <div className="mt-6 space-y-3">
          <input className={inp} placeholder="Họ và tên *" value={applyForm.full_name} onChange={(e) => setApplyForm({ ...applyForm, full_name: e.target.value })} />
          <input className={inp} placeholder="Lĩnh vực chuyên môn * (vd: Lập trình AI, Marketing…)" value={applyForm.expertise} onChange={(e) => setApplyForm({ ...applyForm, expertise: e.target.value })} />
          <textarea className={inp} rows={3} placeholder="Giới thiệu bản thân & kinh nghiệm" value={applyForm.bio} onChange={(e) => setApplyForm({ ...applyForm, bio: e.target.value })} />
          <input className={inp} placeholder="Link sản phẩm/kênh mẫu (YouTube, web, portfolio…)" value={applyForm.sample_links} onChange={(e) => setApplyForm({ ...applyForm, sample_links: e.target.value })} />
          <textarea className={inp} rows={2} placeholder="Bạn muốn dạy chủ đề gì?" value={applyForm.motivation} onChange={(e) => setApplyForm({ ...applyForm, motivation: e.target.value })} />
          <label className="flex items-start gap-2 text-sm text-ink-2"><input type="checkbox" className="mt-1" checked={applyForm.agree_terms} onChange={(e) => setApplyForm({ ...applyForm, agree_terms: e.target.checked })} /> Tôi cam kết nội dung do tôi sở hữu hoặc có quyền sử dụng, không vi phạm bản quyền, và đồng ý với điều khoản nền tảng.</label>
          <button onClick={submitApply} className="w-full rounded-full bg-accent hover:bg-accent-700 text-white font-semibold py-3 cursor-pointer">Gửi đơn đăng ký</button>
        </div>
      </div>
    );
  }

  // ===== Creator Studio =====
  return (
    <div className="container-x py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-accent font-semibold">Khu giảng viên</div>
          <h1 className="text-2xl font-extrabold tracking-tight">Khóa học của tôi</h1>
        </div>
        <button onClick={() => { setEditId(null); setForm(empty); setCreating(true); }} className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold text-sm px-5 py-2.5 cursor-pointer">+ Tạo khóa học</button>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-ink-3">Chưa có khóa học nào. Bấm “Tạo khóa học” để bắt đầu.</div>
      ) : (
        <div className="grid gap-3">
          {courses.map((c) => {
            const st = STATUS[c.review_status] || STATUS.draft;
            return (
              <div key={c.id} className="rounded-card border border-border bg-surface p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{c.title}</span>
                    {c.format === "live" && <span className="text-[11px] font-bold text-accent bg-accent-weak px-2 py-0.5 rounded-full">🔴 LIVE</span>}
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                    <span className="text-xs text-ink-3">{c.price > 0 ? formatVND(c.price) : "Miễn phí"}{c.format !== "live" ? ` · ${Math.round(c.total_minutes || 0)}p` : ""}</span>
                  </div>
                  {c.review_status === "rejected" && c.review_note && <p className="text-xs text-accent mt-1">Góp ý: {c.review_note}</p>}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <button onClick={() => openEdit(c)} className="font-semibold text-ink-2 hover:text-ink cursor-pointer">Sửa</button>
                  <button onClick={() => setManaging(c)} className="font-semibold text-accent cursor-pointer">{c.format === "live" ? "Buổi học" : "Bài học"}</button>
                  <button onClick={() => setTestimonialFor(c)} className="font-semibold text-ink-2 hover:text-ink cursor-pointer">★ Đánh giá</button>
                  {(c.review_status === "draft" || c.review_status === "rejected") && <button onClick={() => submitReview(c)} className="font-semibold text-success cursor-pointer">Gửi duyệt</button>}
                  {c.review_status === "approved" && <Link href={c.format === "live" ? `/live/${c.slug}` : `/courses/${c.slug}`} className="font-semibold text-ink-2 hover:text-ink">Xem</Link>}
                  <button onClick={() => delCourse(c)} className="text-ink-3 hover:text-accent cursor-pointer">Xóa</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal tạo/sửa khóa */}
      {creating && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-[rgba(11,12,14,.5)] backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setCreating(false)}>
          <div className="bg-surface rounded-card border border-border shadow-lg w-full max-w-[560px] max-h-[88vh] overflow-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{editId ? "Sửa khóa học" : "Tạo khóa học mới"}</h3>
              <button onClick={() => setCreating(false)} className="text-ink-3 hover:text-ink text-2xl leading-none cursor-pointer">×</button>
            </div>
            <div className="space-y-3">
              {/* Loại khóa */}
              {!editId && (
                <div className="grid grid-cols-2 gap-2">
                  {[["video", "🎬 Video quay sẵn"], ["live", "🔴 Live (Google Meet)"]].map(([v, label]) => (
                    <button key={v} type="button" onClick={() => setForm({ ...form, format: v })} className={`rounded-lg border px-3 py-2.5 text-sm font-semibold cursor-pointer ${form.format === v ? "border-accent bg-accent-weak text-accent" : "border-border-strong text-ink-2"}`}>{label}</button>
                  ))}
                </div>
              )}
              <input className={inp} placeholder="Tiêu đề khóa học *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

              {/* Ảnh bìa: tải lên (khuyên dùng) + xem trước */}
              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1.5">Ảnh bìa khóa học</label>
                {form.thumb && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={form.thumb} alt="Ảnh bìa" className="w-full max-w-[260px] aspect-video object-cover rounded-lg border border-border mb-2" />
                )}
                <div className="flex gap-2">
                  <label className="rounded-lg border border-border-strong hover:border-accent text-sm font-semibold px-3.5 py-2 cursor-pointer inline-flex items-center whitespace-nowrap">
                    {thumbBusy ? "Đang tải…" : "⬆ Tải ảnh lên"}
                    <input type="file" accept="image/*" className="hidden" disabled={thumbBusy} onChange={(e) => { uploadThumb(e.target.files?.[0]); e.currentTarget.value = ""; }} />
                  </label>
                  {form.thumb && <button onClick={() => setForm({ ...form, thumb: "" })} className="text-sm text-accent font-semibold px-2 cursor-pointer">Xóa ảnh</button>}
                </div>
                <p className="text-ink-3 text-[11px] mt-1">Khuyến nghị tỉ lệ <b>16:9</b> — <b>1280×720</b>. Ảnh tự nén khi tải lên.</p>
              </div>

              {/* Mô tả ngắn + AI gợi ý */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-ink-2">Mô tả ngắn (subtitle)</label>
                  <button onClick={() => aiSuggest("subtitle")} disabled={subBusy} className="text-xs font-semibold text-accent hover:underline cursor-pointer disabled:opacity-60">{subBusy ? "Đang gợi ý…" : "✨ AI gợi ý"}</button>
                </div>
                <input className={inp} placeholder="Câu giới thiệu ngắn gọn, hấp dẫn" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
              </div>

              {/* Mô tả chi tiết + AI viết / làm đẹp */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-ink-2">Mô tả chi tiết</label>
                  <div className="flex gap-3">
                    <button onClick={() => aiSuggest("description")} disabled={descBusy} className="text-xs font-semibold text-accent hover:underline cursor-pointer disabled:opacity-60">{descBusy ? "Đang xử lý…" : "✨ AI viết mới"}</button>
                    <button onClick={() => aiSuggest("beautify")} disabled={descBusy} className="text-xs font-semibold text-accent hover:underline cursor-pointer disabled:opacity-60">🪄 Làm đẹp</button>
                  </div>
                </div>
                <textarea className={`${inp} min-h-[140px] resize-y`} placeholder="Dạy gì, đạt được gì, phù hợp với ai… (Markdown: ## tiêu đề, - gạch đầu dòng, **in đậm**). Nhập ý thô rồi bấm 🪄 Làm đẹp để AI bố cục lại." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>

              <input className={inp} placeholder="Danh mục (vd: Lập trình, AI, Marketing)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <select className={inp} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}><option>Cơ bản</option><option>Trung cấp</option><option>Nâng cao</option></select>

              {/* Học phí: Miễn phí / Có phí + giá bán + giá gốc */}
              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1.5">Học phí</label>
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => setForm({ ...form, price: "0", compare_price: "" })} className={`flex-1 rounded-lg border py-2 text-sm font-semibold cursor-pointer ${Number(form.price) === 0 ? "border-success bg-success/10 text-success" : "border-border-strong text-ink-2"}`}>🆓 Miễn phí</button>
                  <button type="button" onClick={() => setForm({ ...form, price: Number(form.price) > 0 ? form.price : "299000" })} className={`flex-1 rounded-lg border py-2 text-sm font-semibold cursor-pointer ${Number(form.price) > 0 ? "border-accent bg-accent-weak text-accent" : "border-border-strong text-ink-2"}`}>💳 Có phí</button>
                </div>
                {Number(form.price) > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-ink-3 mb-1">Giá bán thực (VND)</label>
                      <input className={inp} type="number" placeholder="vd 299000" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[11px] text-ink-3 mb-1">Giá gốc — gạch ngang (tùy chọn)</label>
                      <input className={inp} type="number" placeholder="vd 599000" value={form.compare_price} onChange={(e) => setForm({ ...form, compare_price: e.target.value })} />
                    </div>
                  </div>
                )}
                {Number(form.compare_price) > Number(form.price) && Number(form.price) > 0 && (
                  <p className="text-xs text-success mt-1.5">Hiển thị giảm <b>{Math.round((1 - Number(form.price) / Number(form.compare_price)) * 100)}%</b> trên thẻ khóa học.</p>
                )}
              </div>

              {form.format === "live" && <input className={inp} type="number" placeholder="Sức chứa (số chỗ tối đa — để trống = không giới hạn)" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />}
              {form.format === "live" ? (
                <p className="text-xs text-ink-3">🔴 Khóa LIVE: học qua Google Meet. Sau khi tạo, vào “Buổi học” để thêm lịch các buổi (link Meet tự sinh nếu admin đã kết nối Google).</p>
              ) : Number(form.price) > 0 ? (
                <p className="text-xs text-ink-3">🔒 Khóa thu phí: video phải <b>tải lên hệ thống</b> (không dùng link YouTube). Bạn sẽ tải video ở bước “Bài học”.</p>
              ) : null}

              {/* Marketing / bán hàng — tăng chuyển đổi trang khóa */}
              <details className="border border-border rounded-lg p-3">
                <summary className="text-sm font-semibold cursor-pointer">🚀 Marketing / bán hàng (giảng viên, cam kết, FAQ) — tùy chọn</summary>
                <div className="space-y-2 mt-3">
                  <input className={inp} placeholder="Ảnh đại diện giảng viên (URL)" value={form.instructor_avatar} onChange={(e) => setForm({ ...form, instructor_avatar: e.target.value })} />
                  <textarea className={inp} rows={2} placeholder="Giới thiệu giảng viên (kinh nghiệm, thành tích…)" value={form.instructor_bio} onChange={(e) => setForm({ ...form, instructor_bio: e.target.value })} />
                  <textarea className={inp} rows={2} placeholder="Cam kết/đảm bảo (vd: hỗ trợ trọn đời, có bản ghi xem lại…) — để trống dùng mặc định" value={form.guarantee} onChange={(e) => setForm({ ...form, guarantee: e.target.value })} />
                  <div>
                    <label className="block text-[11px] text-ink-3 mb-1">FAQ — mỗi dòng: <code className="bg-bg-soft px-1 rounded">Câu hỏi | Trả lời</code> (để trống dùng FAQ mặc định)</label>
                    <textarea className={`${inp} font-mono`} rows={3} placeholder={"Tôi mới bắt đầu học được không? | Được, khóa phù hợp người mới...\nLỡ buổi thì sao? | Có bản ghi xem lại..."} value={form.faqText} onChange={(e) => setForm({ ...form, faqText: e.target.value })} />
                  </div>
                  <p className="text-[11px] text-ink-3">Đánh giá học viên: lưu khóa xong, bấm nút <b>★ Đánh giá</b> ở danh sách để thêm.</p>
                </div>
              </details>

              <div className="flex gap-2 pt-1">
                <button onClick={saveCourse} className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold text-sm px-5 py-2.5 cursor-pointer">{editId ? "Lưu" : "Tạo khóa"}</button>
                <button onClick={() => setCreating(false)} className="rounded-full border border-border-strong text-sm px-4 py-2.5 cursor-pointer">Hủy</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {managing && (managing.format === "live"
        ? <LiveSessionManager courseId={managing.id} onClose={() => { setManaging(null); loadCourses(); }} />
        : <TeachLessonManager courseId={managing.id} isPaid={(managing.price || 0) > 0} onClose={() => { setManaging(null); loadCourses(); }} />)}
      {testimonialFor && <TestimonialManager courseId={testimonialFor.id} onClose={() => setTestimonialFor(null)} />}
    </div>
  );
}
