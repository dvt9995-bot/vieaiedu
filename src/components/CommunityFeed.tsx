"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuthModal } from "./AuthModal";
import { toast } from "./Toaster";
import {
  loadPosts, createPost, togglePostLike, uploadCommunityImage,
  loadComments, addComment, currentUserId, isConfigured, type DBPost, type DBComment,
} from "@/lib/db";
import type { Course } from "@/lib/types";

function PostComments({ postId }: { postId: string }) {
  const { open } = useAuthModal();
  const [items, setItems] = useState<DBComment[] | null>(null);
  const [text, setText] = useState("");
  useEffect(() => { loadComments(postId).then(setItems); }, [postId]);
  async function send() {
    if (!text.trim()) return;
    const ok = await addComment(postId, text.trim());
    if (!ok) return open("login");
    setText(""); loadComments(postId).then(setItems);
  }
  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="flex gap-2 mb-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Viết bình luận…" className="flex-1 bg-bg-soft border border-border rounded-full px-3 py-1.5 text-sm outline-none focus:border-accent" />
        <button onClick={send} className="text-accent font-semibold text-sm cursor-pointer">Gửi</button>
      </div>
      {(items || []).map((c) => (
        <div key={c.id} className="flex gap-2 py-1.5 text-sm"><b className="text-ink">{c.author}</b><span className="text-ink-2">{c.body}</span></div>
      ))}
    </div>
  );
}

export default function CommunityFeed() {
  const { open } = useAuthModal();
  const [posts, setPosts] = useState<DBPost[]>([]);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [courses, setCourses] = useState<Record<string, Course>>({});

  const refresh = useCallback(async () => setPosts(await loadPosts()), []);
  useEffect(() => {
    refresh();
    currentUserId().then(setUid);
    fetch("/api/courses").then((r) => r.json()).then((d) => {
      const m: Record<string, Course> = {};
      (d.courses as Course[]).forEach((c) => (m[c.slug] = c));
      setCourses(m);
    }).catch(() => {});
  }, [refresh]);

  async function onPost() {
    if (!text.trim() && !file) return;
    if (!isConfigured() || !uid) return open("login");
    setBusy(true);
    let imageUrl: string | null = null;
    if (file) imageUrl = await uploadCommunityImage(file);
    const ok = await createPost(text.trim(), imageUrl);
    setBusy(false);
    if (!ok) { toast("Đăng bài thất bại", "error"); return open("login"); }
    setText(""); setFile(null); toast("Đã đăng bài"); refresh();
  }

  function onLike(p: DBPost) {
    if (!uid) return open("login");
    const next = !liked[p.id];
    setLiked({ ...liked, [p.id]: next });
    togglePostLike(p.id, next);
  }

  return (
    <div className="max-w-[600px] mx-auto">
      <div className="flex flex-col gap-4">
        {/* Compose */}
        <div className="bg-surface border border-border rounded-card p-4 shadow-soft">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={uid ? "Chia sẻ điều bạn vừa học được..." : "Đăng nhập để chia sẻ..."} onClick={() => !uid && open("login")} className="w-full bg-bg-soft border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent resize-none min-h-[60px]" />
          {file && <div className="text-xs text-ink-2 mt-2">📎 {file.name} <button onClick={() => setFile(null)} className="text-accent cursor-pointer">(bỏ)</button></div>}
          <div className="flex items-center justify-between mt-2">
            <label className="text-sm text-ink-2 cursor-pointer hover:text-accent">📷 Ảnh
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
            <button onClick={onPost} disabled={busy} className="rounded-full bg-accent hover:bg-accent-700 disabled:opacity-60 text-white font-semibold text-sm px-5 py-2 cursor-pointer transition-colors">{busy ? "Đang đăng…" : "Đăng"}</button>
          </div>
        </div>

        {posts.map((p) => {
          const isLiked = liked[p.id];
          const sharedCourse = p.courseSlug ? courses[p.courseSlug] : undefined;
          return (
            <div key={p.id} className="bg-surface border border-border rounded-card p-[18px]">
              <div className="flex items-center gap-2.5 mb-3">
                <Link href={p.authorId ? `/u/${p.authorId}` : "#"} className="flex items-center gap-2.5 group">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white" style={{ background: p.avatarColor }}>{p.author[0]}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <b className="text-sm group-hover:text-accent transition-colors">{p.author}</b>
                      {p.role === "admin" && <span className="text-[10px] font-bold text-white bg-accent px-1.5 py-0.5 rounded">BQT</span>}
                      {p.role === "instructor" && <span className="text-[10px] font-bold text-accent bg-accent-weak px-1.5 py-0.5 rounded">Giảng viên</span>}
                    </div>
                    <span className="text-ink-3 text-xs">{p.time}{p.owned > 0 && ` · 🎓 Sở hữu ${p.owned} khóa`}</span>
                  </div>
                </Link>
              </div>
              <p className="text-[.96rem] mb-3 whitespace-pre-wrap">{p.body}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.image && <img src={p.image} alt="" className="rounded-[10px] w-full border border-border mb-3" />}
              {sharedCourse && (
                <Link href={`/courses/${sharedCourse.slug}`} className="flex gap-3 items-center rounded-[10px] border border-border p-2.5 mb-3 hover:border-border-strong transition-colors">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sharedCourse.thumb} alt="" className="w-20 h-14 object-cover rounded" />
                  <div><div className="font-semibold text-sm">{sharedCourse.title}</div><div className="text-accent text-xs font-semibold">Xem khóa học →</div></div>
                </Link>
              )}
              <div className="flex gap-6 border-t border-border pt-3 text-ink-2 text-sm font-medium">
                <button onClick={() => onLike(p)} className={`inline-flex gap-1.5 items-center cursor-pointer transition-colors ${isLiked ? "text-accent" : "hover:text-ink"}`}>♥ {p.likes + (isLiked ? 1 : 0)}</button>
                <button onClick={() => setOpenComments({ ...openComments, [p.id]: !openComments[p.id] })} className="inline-flex gap-1.5 items-center cursor-pointer hover:text-ink">💬 {p.comments}</button>
              </div>
              {openComments[p.id] && <PostComments postId={p.id} />}
            </div>
          );
        })}
        {posts.length === 0 && <p className="text-center text-ink-3 py-10">Chưa có bài viết. Hãy là người đầu tiên chia sẻ!</p>}
      </div>
    </div>
  );
}
