"use client";
import { useEffect, useState } from "react";
import { useAuthModal } from "./AuthModal";
import { loadPosts, createPost, togglePostLike, isConfigured, type DBPost } from "@/lib/db";

export default function CommunityFeed() {
  const { open } = useAuthModal();
  const [posts, setPosts] = useState<DBPost[]>([]);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() { setPosts(await loadPosts()); }
  useEffect(() => { refresh(); }, []);

  async function onPost() {
    if (!text.trim()) return;
    setBusy(true);
    const ok = await createPost(text.trim());
    setBusy(false);
    if (!ok) return open("login"); // chưa đăng nhập / chưa cấu hình
    setText(""); refresh();
  }

  function onLike(p: DBPost) {
    const next = !liked[p.id];
    setLiked({ ...liked, [p.id]: next });
    if (isConfigured()) togglePostLike(p.id, next);
  }

  return (
    <div className="max-w-[600px] mx-auto flex flex-col gap-4">
      <div className="flex gap-3 items-center bg-surface border border-border rounded-card p-4 shadow-soft">
        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold text-white">B</div>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onPost()}
          placeholder="Chia sẻ điều bạn vừa học được..."
          className="flex-1 bg-bg-soft border border-border rounded-full px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button onClick={onPost} disabled={busy} className="rounded-full bg-accent hover:bg-accent-700 disabled:opacity-60 text-white font-semibold text-sm px-4 py-2 cursor-pointer transition-colors">Đăng</button>
      </div>

      {posts.map((p) => {
        const isLiked = liked[p.id];
        return (
          <div key={p.id} className="bg-surface border border-border rounded-card p-[18px]">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white" style={{ background: p.avatarColor }}>{p.author[0]}</div>
              <div><b className="text-sm">{p.author}</b><br /><span className="text-ink-3 text-xs">{p.time}</span></div>
            </div>
            <p className="text-[.96rem] mb-3">{p.body}</p>
            {p.image && <div className="rounded-[10px] aspect-video bg-bg-soft border border-border mb-3 flex items-center justify-center text-ink-3 text-sm">🖼️ {p.image}</div>}
            <div className="flex gap-6 border-t border-border pt-3 text-ink-2 text-sm font-medium">
              <button onClick={() => onLike(p)} className={`inline-flex gap-1.5 items-center cursor-pointer transition-colors ${isLiked ? "text-accent" : "hover:text-ink"}`}>♥ {p.likes + (isLiked ? 1 : 0)}</button>
              <button onClick={() => open("login")} className="inline-flex gap-1.5 items-center cursor-pointer hover:text-ink">💬 {p.comments}</button>
              <button className="inline-flex gap-1.5 items-center cursor-pointer hover:text-ink">↗ Chia sẻ</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
