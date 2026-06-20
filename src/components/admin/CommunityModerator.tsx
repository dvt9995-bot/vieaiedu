"use client";
import { useEffect, useState } from "react";
import { toast } from "@/components/Toaster";

interface Post { id: string; body: string; image: string | null; hidden: boolean; created_at: string; author: string; author_id: string; }

export default function CommunityModerator() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() { setLoading(true); const r = await fetch("/api/admin/posts").then((x) => x.json()).catch(() => ({ posts: [] })); setPosts(r.posts || []); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function toggle(p: Post) { await fetch("/api/admin/posts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, hidden: !p.hidden }) }); toast(p.hidden ? "Đã hiện lại bài" : "Đã ẩn bài"); load(); }
  async function del(id: string) { if (confirm("Xóa hẳn bài viết này?")) { await fetch(`/api/admin/posts?id=${id}`, { method: "DELETE" }); toast("Đã xóa bài viết"); load(); } }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg">Kiểm duyệt cộng đồng <span className="text-ink-3 font-normal">({posts.length})</span></h2>
        <button onClick={load} className="text-sm text-ink-3 hover:text-ink cursor-pointer">↻ Tải lại</button>
      </div>
      <div className="space-y-3">
        {loading ? <p className="text-ink-3">Đang tải…</p>
        : posts.length === 0 ? <p className="text-ink-3">Chưa có bài viết nào.</p>
        : posts.map((p) => (
          <div key={p.id} className={`rounded-card border p-4 ${p.hidden ? "border-border bg-bg-soft opacity-70" : "border-border bg-surface"}`}>
            <div className="flex items-center gap-2 mb-2 text-sm">
              <a href={`/u/${p.author_id}`} target="_blank" className="font-semibold hover:text-accent">{p.author}</a>
              <span className="text-ink-3 text-xs">· {new Date(p.created_at).toLocaleDateString("vi-VN")}</span>
              {p.hidden && <span className="text-[10px] font-bold text-white bg-ink-3 px-1.5 py-0.5 rounded">ĐÃ ẨN</span>}
            </div>
            <p className="text-sm text-ink-2 whitespace-pre-wrap line-clamp-4">{p.body}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.image && <img src={p.image} alt="" className="rounded mt-2 max-h-40 border border-border" />}
            <div className="flex gap-4 mt-3 pt-3 border-t border-border text-sm font-semibold">
              <button onClick={() => toggle(p)} className={`cursor-pointer ${p.hidden ? "text-success" : "text-ink-2 hover:text-ink"}`}>{p.hidden ? "Hiện lại" : "Ẩn bài"}</button>
              <button onClick={() => del(p.id)} className="text-accent cursor-pointer">Xóa</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
