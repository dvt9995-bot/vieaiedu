"use client";
import { useEffect, useState } from "react";
import { toast } from "@/components/Toaster";

interface Post { id: string; slug: string; title: string; excerpt: string; body: string; cover_url: string | null; published: boolean; source_name?: string | null; published_at: string; }
const empty = { title: "", excerpt: "", body: "", cover_url: "", published: true };

export default function BlogManager() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<(typeof empty & { id?: string }) | null>(null);
  const [msg, setMsg] = useState("");
  const [feeds, setFeeds] = useState("");
  const [showFeeds, setShowFeeds] = useState(false);

  async function load() { setLoading(true); const r = await fetch("/api/admin/blog").then((x) => x.json()).catch(() => ({ posts: [] })); setPosts(r.posts || []); setLoading(false); }
  useEffect(() => {
    load();
    fetch("/api/admin/settings").then((r) => r.json()).then((d) => setFeeds(d.settings?.blog_feeds || "")).catch(() => {});
  }, []);

  async function saveFeeds() {
    const r = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values: { blog_feeds: feeds } }) }).then((x) => x.json());
    toast(r.ok ? "Đã lưu nguồn tin" : r.error || "Lỗi", r.ok ? "success" : "error");
  }

  async function save() {
    if (!edit?.title.trim()) return setMsg("Cần tiêu đề");
    setMsg("Đang lưu…");
    const method = edit.id ? "PATCH" : "POST";
    const r = await fetch("/api/admin/blog", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(edit) }).then((x) => x.json());
    if (r.ok) { setEdit(null); setMsg("✓ Đã lưu"); toast("Đã lưu bài viết"); load(); } else { setMsg(r.error || "Lỗi"); toast(r.error || "Lưu thất bại", "error"); }
  }
  async function uploadCover(file: File) {
    if (!edit) return;
    toast("Đang tải ảnh bìa…", "info");
    const fd = new FormData(); fd.append("file", file); fd.append("bucket", "blog");
    const r = await fetch("/api/admin/upload", { method: "POST", body: fd }).then((x) => x.json()).catch(() => ({}));
    if (r.url) { setEdit({ ...edit, cover_url: r.url }); toast("Đã tải ảnh bìa"); }
    else toast(r.error || "Tải ảnh thất bại", "error");
  }
  async function del(id: string) { if (confirm("Xóa bài viết này?")) { await fetch(`/api/admin/blog?id=${id}`, { method: "DELETE" }); toast("Đã xóa bài viết"); load(); } }
  async function togglePublish(p: Post) { await fetch("/api/admin/blog", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, published: !p.published }) }); toast(p.published ? "Đã ẩn bài" : "Đã hiện bài"); load(); }
  async function autoGen() {
    setMsg("Đang tạo bài từ tin AI mới nhất… (~30s)"); toast("Đang tạo bài từ tin AI…", "info");
    const r = await fetch("/api/cron/blog").then((x) => x.json()).catch(() => ({}));
    const m = r.skipped ? r.skipped : r.created != null ? `✓ Đã tạo ${r.created} bài mới` : r.error || "Lỗi";
    setMsg(m); toast(m, r.created ? "success" : "info");
    load();
  }

  const inp = "w-full px-3 py-2.5 rounded-lg border border-border-strong bg-surface text-sm outline-none focus:border-accent";

  if (edit) return (
    <div className="max-w-[680px]">
      <button onClick={() => setEdit(null)} className="text-ink-3 text-sm mb-4 cursor-pointer hover:text-ink">← Quay lại danh sách</button>
      <h2 className="font-bold text-lg mb-4">{edit.id ? "Sửa bài viết" : "Thêm bài viết"}</h2>
      <div className="space-y-3">
        <input className={inp} placeholder="Tiêu đề" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
        <input className={inp} placeholder="Tóm tắt ngắn" value={edit.excerpt} onChange={(e) => setEdit({ ...edit, excerpt: e.target.value })} />
        <div>
          <div className="flex items-center gap-3 mb-2">
            <label className="rounded-full border border-border-strong hover:border-accent hover:text-accent text-sm font-semibold px-4 py-2 cursor-pointer transition-colors">
              📷 Tải ảnh bìa
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
            </label>
            <span className="text-ink-3 text-xs">hoặc dán URL bên dưới</span>
          </div>
          <input className={inp} placeholder="Ảnh bìa (URL)" value={edit.cover_url} onChange={(e) => setEdit({ ...edit, cover_url: e.target.value })} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {edit.cover_url && <img src={edit.cover_url} alt="" className="mt-2 rounded-lg border border-border max-h-44 object-cover" />}
        </div>
        <textarea className={`${inp} min-h-[280px] font-mono text-xs`} placeholder="Nội dung (Markdown: ## tiêu đề, **đậm**, - gạch đầu dòng, [link](url))" value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.published} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} /> Xuất bản (hiển thị công khai)</label>
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button onClick={save} className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold px-6 py-2.5 cursor-pointer transition-colors">Lưu</button>
        {msg && <span className="text-sm text-ink-2">{msg}</span>}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="font-bold text-lg">Quản lý Blog <span className="text-ink-3 font-normal">({posts.length})</span></h2>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowFeeds((s) => !s)} className="rounded-full border border-border-strong hover:border-accent hover:text-accent font-semibold text-sm px-4 py-2 cursor-pointer transition-colors">🛰 Nguồn tin</button>
          <button onClick={() => { setEdit({ ...empty }); setMsg(""); }} className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold text-sm px-4 py-2 cursor-pointer transition-colors">+ Thêm bài viết</button>
          <button onClick={autoGen} className="rounded-full border border-border-strong hover:border-accent hover:text-accent font-semibold text-sm px-4 py-2 cursor-pointer transition-colors">📰 Tạo tự động ngay</button>
        </div>
      </div>

      {showFeeds && (
        <div className="rounded-card border border-border bg-surface p-5 mb-4">
          <h3 className="font-semibold mb-1">Nguồn tìm bài (RSS)</h3>
          <p className="text-ink-3 text-xs mb-3">Mỗi dòng một nguồn, dạng <code className="bg-bg-soft px-1 rounded">link_rss | Tên nguồn</code>. Hệ thống đã có sẵn TechCrunch, VentureBeat, The Verge, MIT, Google AI, WIRED — thêm vào đây để mở rộng.</p>
          <textarea
            value={feeds} onChange={(e) => setFeeds(e.target.value)}
            placeholder={"https://example.com/feed | Tên nguồn\nhttps://blog.openai.com/rss | OpenAI"}
            className="w-full min-h-[120px] font-mono text-xs px-3 py-2.5 rounded-lg border border-border-strong bg-surface outline-none focus:border-accent"
          />
          <button onClick={saveFeeds} className="mt-2 rounded-full bg-accent hover:bg-accent-700 text-white font-semibold text-sm px-5 py-2 cursor-pointer transition-colors">Lưu nguồn tin</button>
        </div>
      )}

      {msg && <p className="text-sm text-ink-2 mb-3">{msg}</p>}
      <div className="rounded-card border border-border bg-surface overflow-hidden">
        {loading ? <p className="p-6 text-center text-ink-3">Đang tải…</p>
        : posts.length === 0 ? <p className="p-6 text-center text-ink-3">Chưa có bài viết. Thêm thủ công hoặc bấm “Tạo tự động”.</p>
        : posts.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-3 border-b border-border last:border-0">
            <div className="w-14 h-10 rounded bg-bg-soft overflow-hidden flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.cover_url && <img src={p.cover_url} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{p.title}</div>
              <div className="text-ink-3 text-xs">{new Date(p.published_at).toLocaleDateString("vi-VN")}{p.source_name && ` · ${p.source_name}`}{!p.published && " · 🔒 nháp"}</div>
            </div>
            <button onClick={() => togglePublish(p)} className="text-xs text-ink-3 hover:text-ink cursor-pointer">{p.published ? "Ẩn" : "Hiện"}</button>
            <a href={`/blog/${p.slug}`} target="_blank" className="text-xs text-ink-3 hover:text-ink">Xem</a>
            <button onClick={() => { setEdit({ id: p.id, title: p.title, excerpt: p.excerpt || "", body: p.body || "", cover_url: p.cover_url || "", published: p.published }); setMsg(""); }} className="text-xs text-accent font-semibold cursor-pointer">Sửa</button>
            <button onClick={() => del(p.id)} className="text-xs text-ink-3 hover:text-accent cursor-pointer">Xóa</button>
          </div>
        ))}
      </div>
    </div>
  );
}
