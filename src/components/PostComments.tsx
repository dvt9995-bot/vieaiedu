"use client";
import { useEffect, useState } from "react";
import { useAuthModal } from "./AuthModal";
import { loadComments, addComment, type DBComment } from "@/lib/db";

export default function PostComments({ postId }: { postId: string }) {
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
      {items && items.length === 0 && <p className="text-ink-3 text-sm py-1">Chưa có bình luận.</p>}
    </div>
  );
}
