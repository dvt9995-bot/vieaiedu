"use client";
import { useEffect, useState } from "react";
import { useAuthModal } from "./AuthModal";
import { toast } from "./Toaster";
import { track } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";

interface Comment { id: string; body: string; created_at: string; author: string }

export default function BlogEngagement({ postId }: { postId: string }) {
  const { open } = useAuthModal();
  const [uid, setUid] = useState<string | null>(null);
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");

  async function loadComments() {
    const c = createClient(); if (!c) return;
    const { data } = await c.from("blog_comments").select("id, body, created_at, profiles(full_name)").eq("post_id", postId).order("created_at");
    setComments((data || []).map((x) => ({ id: x.id as string, body: x.body as string, created_at: x.created_at as string, author: (x as { profiles?: { full_name?: string } }).profiles?.full_name || "Học viên" })));
  }

  useEffect(() => {
    const c = createClient(); if (!c) return;
    c.rpc("blog_stats", { p_id: postId }).then(({ data }) => { if (data) setLikes(Number((data as { likes: number }).likes) || 0); });
    c.auth.getUser().then(({ data }) => {
      const u = data.user?.id ?? null; setUid(u);
      if (u) c.from("blog_likes").select("post_id").eq("post_id", postId).eq("user_id", u).maybeSingle().then(({ data: d }) => setLiked(!!d));
    });
    loadComments();
  }, [postId]);

  async function toggleLike() {
    const c = createClient(); if (!c) return;
    if (!uid) return open("login");
    const next = !liked;
    setLiked(next); setLikes((n) => n + (next ? 1 : -1));
    if (next) { await c.from("blog_likes").upsert({ post_id: postId, user_id: uid }, { onConflict: "post_id,user_id" }); track("blog_like", { post_id: postId }); }
    else await c.from("blog_likes").delete().eq("post_id", postId).eq("user_id", uid);
  }

  async function addComment() {
    const c = createClient(); if (!c) return;
    if (!uid) return open("login");
    if (!text.trim()) return;
    const { error } = await c.from("blog_comments").insert({ post_id: postId, author_id: uid, body: text.trim() });
    if (error) return toast("Không gửi được bình luận", "error");
    setText(""); track("blog_comment", { post_id: postId }); loadComments();
  }

  return (
    <section className="mt-8 pt-6 border-t border-border">
      <div className="flex items-center gap-4 mb-5">
        <button onClick={toggleLike} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-semibold text-sm cursor-pointer transition-colors ${liked ? "border-accent text-accent bg-accent-weak" : "border-border-strong text-ink-2 hover:border-accent hover:text-accent"}`}>
          {liked ? "♥" : "♡"} {likes} Thích
        </button>
        <span className="text-ink-3 text-sm">💬 {comments.length} bình luận</span>
      </div>

      <h3 className="font-bold mb-3">Bình luận</h3>
      <div className="flex gap-2 mb-4">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComment()} onFocusCapture={() => !uid && open("login")} placeholder={uid ? "Viết bình luận…" : "Đăng nhập để bình luận…"} className="flex-1 bg-bg-soft border border-border-strong rounded-full px-4 py-2.5 text-sm outline-none focus:border-accent" />
        <button onClick={addComment} className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold text-sm px-5 cursor-pointer transition-colors">Gửi</button>
      </div>

      {comments.length === 0 ? (
        <p className="text-ink-3 text-sm">Chưa có bình luận. Hãy là người đầu tiên!</p>
      ) : (
        <div className="space-y-3">
          {comments.map((cm) => (
            <div key={cm.id} className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full bg-accent text-white grid place-items-center font-bold text-xs shrink-0">{cm.author[0]}</div>
              <div className="bg-bg-soft rounded-2xl px-3.5 py-2 flex-1">
                <div className="text-sm font-semibold">{cm.author} <span className="text-ink-3 font-normal text-xs">· {new Date(cm.created_at).toLocaleDateString("vi-VN")}</span></div>
                <p className="text-ink-2 text-sm">{cm.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
