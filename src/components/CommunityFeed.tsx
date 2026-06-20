"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuthModal } from "./AuthModal";
import { toast } from "./Toaster";
import PostComments from "./PostComments";
import FilterMenu from "./FilterMenu";
import { track } from "@/lib/analytics";
import { compressImage } from "@/lib/image";
import { TOPICS } from "@/lib/topics";
import {
  loadPosts, createPost, togglePostLike, uploadCommunityImage,
  currentUserId, isConfigured, type DBPost,
} from "@/lib/db";
import type { Course } from "@/lib/types";

const LS_KEY = "vie:interests";

export default function CommunityFeed() {
  const { open } = useAuthModal();
  const [posts, setPosts] = useState<DBPost[]>([]);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [text, setText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [courses, setCourses] = useState<Record<string, Course>>({});
  const [filter, setFilter] = useState<string>("");
  const [interests, setInterests] = useState<string[]>([]);
  const [showOnboard, setShowOnboard] = useState(false);

  const refresh = useCallback(async () => setPosts(await loadPosts()), []);
  useEffect(() => {
    refresh();
    currentUserId().then(setUid);
    fetch("/api/courses").then((r) => r.json()).then((d) => {
      const m: Record<string, Course> = {};
      (d.courses as Course[]).forEach((c) => (m[c.slug] = c));
      setCourses(m);
    }).catch(() => {});
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (Array.isArray(saved)) setInterests(saved); else setShowOnboard(true);
    } catch { setShowOnboard(true); }
  }, [refresh]);

  const composeRef = useRef<HTMLTextAreaElement>(null);
  function applyTemplate(text: string, tag?: string) {
    if (!uid) return open("login");
    setText(text);
    if (tag) setTags((cur) => (cur.includes(tag) ? cur : [...cur, tag]));
    composeRef.current?.focus();
    composeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function toggleTag(t: string) { setTags((cur) => cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]); }
  function saveInterests(list: string[]) { setInterests(list); localStorage.setItem(LS_KEY, JSON.stringify(list)); setShowOnboard(false); toast("Đã lưu chủ đề quan tâm"); }

  async function onPost() {
    if (!text.trim() && !file) return;
    if (!isConfigured() || !uid) return open("login");
    setBusy(true);
    let imageUrl: string | null = null;
    if (file) {
      const compressed = await compressImage(file);
      imageUrl = await uploadCommunityImage(compressed);
      if (!imageUrl) { setBusy(false); toast("Tải ảnh thất bại — ảnh quá lớn hoặc lỗi mạng, vui lòng thử lại", "error"); return; }
    }
    const ok = await createPost(text.trim(), imageUrl, null, tags);
    setBusy(false);
    if (!ok) { toast("Đăng bài thất bại", "error"); return open("login"); }
    track("post_create", { has_image: !!imageUrl, tags: tags.join(",") });
    setText(""); setFile(null); setTags([]); toast("Đã đăng bài"); refresh();
  }

  function onLike(p: DBPost) {
    if (!uid) return open("login");
    const next = !liked[p.id];
    setLiked({ ...liked, [p.id]: next });
    togglePostLike(p.id, next);
  }

  // Lọc theo chủ đề + ưu tiên bài khớp sở thích
  const visible = posts
    .filter((p) => !filter || (p.tags || []).includes(filter))
    .sort((a, b) => {
      const am = (a.tags || []).some((t) => interests.includes(t)) ? 0 : 1;
      const bm = (b.tags || []).some((t) => interests.includes(t)) ? 0 : 1;
      return am - bm;
    });

  return (
    <div className="max-w-[600px] mx-auto">
      {/* Onboarding chọn chủ đề */}
      {showOnboard && (
        <div className="bg-accent-weak border border-accent/30 rounded-card p-4 mb-4">
          <div className="font-bold mb-1">Chọn chủ đề bạn quan tâm</div>
          <p className="text-ink-2 text-sm mb-3">Bảng tin sẽ ưu tiên hiển thị nội dung phù hợp với bạn.</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {TOPICS.map((t) => {
              const on = interests.includes(t);
              return <button key={t} onClick={() => setInterests((c) => on ? c.filter((x) => x !== t) : [...c, t])} className={`text-sm rounded-full px-3 py-1.5 border cursor-pointer transition-colors ${on ? "bg-accent text-white border-accent" : "bg-surface border-border-strong hover:border-accent"}`}>{t}</button>;
            })}
          </div>
          <div className="flex gap-2">
            <button onClick={() => saveInterests(interests)} className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold text-sm px-5 py-2 cursor-pointer">Lưu</button>
            <button onClick={() => saveInterests([])} className="rounded-full text-ink-3 hover:text-ink text-sm px-3 cursor-pointer">Bỏ qua</button>
          </div>
        </div>
      )}

      {/* Lọc chủ đề (phễu) */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-ink-3 text-sm">{filter ? `Chủ đề: #${filter}` : "Tất cả bài viết"}</span>
        <FilterMenu
          align="right"
          groups={[{ key: "topic", label: "Chủ đề", value: filter, onChange: setFilter, options: [{ value: "", label: "Tất cả" }, ...TOPICS.map((t) => ({ value: t, label: t }))] }]}
        />
      </div>

      <div className="flex flex-col gap-4">
        {/* Lời mời viết bài đầu tiên */}
        {!text && (
          <div className="rounded-card border border-accent/25 bg-gradient-to-br from-accent-weak to-transparent p-5">
            <div className="text-lg font-extrabold tracking-tight">👋 Chào mừng đến với cộng đồng AI!</div>
            <p className="text-ink-2 text-sm mt-1 mb-3 max-w-[60ch]">Hãy bắt đầu bằng một bài chia sẻ: giới thiệu bản thân &amp; công việc, lý do bạn quan tâm AI, hoặc điều bạn muốn học hỏi. Một dòng cũng quý — cộng đồng luôn chào đón!</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => applyTemplate("Xin chào cả nhà! Mình là [tên], hiện đang làm [nghề nghiệp]. Mình mới tham gia cộng đồng và rất mong được học hỏi, chia sẻ kiến thức về AI cùng mọi người 🙌", "Kinh nghiệm")} className="text-sm rounded-full bg-surface border border-border-strong hover:border-accent hover:text-accent px-3.5 py-1.5 cursor-pointer transition-colors">👤 Giới thiệu bản thân</button>
              <button onClick={() => applyTemplate("Mình vừa học được một điều thú vị về AI: [chia sẻ của bạn]. Hy vọng hữu ích cho mọi người!", "Kinh nghiệm")} className="text-sm rounded-full bg-surface border border-border-strong hover:border-accent hover:text-accent px-3.5 py-1.5 cursor-pointer transition-colors">💡 Chia sẻ kiến thức</button>
              <button onClick={() => applyTemplate("Mình đang tìm hiểu về [chủ đề AI] và có một thắc mắc: [câu hỏi của bạn]. Ai có kinh nghiệm chỉ giúp mình với ạ?", "Hỏi đáp")} className="text-sm rounded-full bg-surface border border-border-strong hover:border-accent hover:text-accent px-3.5 py-1.5 cursor-pointer transition-colors">❓ Đặt câu hỏi</button>
            </div>
          </div>
        )}

        {/* Compose */}
        <div className="bg-surface border border-border rounded-card p-4 shadow-soft">
          <textarea ref={composeRef} value={text} onChange={(e) => setText(e.target.value)} placeholder={uid ? "Chia sẻ điều bạn vừa học được..." : "Đăng nhập để chia sẻ..."} onClick={() => !uid && open("login")} className="w-full bg-bg-soft border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent resize-none min-h-[60px]" />
          {/* Chọn chủ đề cho bài */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {TOPICS.map((t) => (
              <button key={t} onClick={() => toggleTag(t)} className={`text-xs rounded-full px-2.5 py-1 border cursor-pointer transition-colors ${tags.includes(t) ? "bg-accent text-white border-accent" : "bg-bg-soft border-border hover:border-accent"}`}>#{t}</button>
            ))}
          </div>
          {file && <div className="text-xs text-ink-2 mt-2">📎 {file.name} <button onClick={() => setFile(null)} className="text-accent cursor-pointer">(bỏ)</button></div>}
          <div className="flex items-center justify-between mt-2">
            <label className="text-sm text-ink-2 cursor-pointer hover:text-accent">📷 Ảnh
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
            <button onClick={onPost} disabled={busy} className="rounded-full bg-accent hover:bg-accent-700 disabled:opacity-60 text-white font-semibold text-sm px-5 py-2 cursor-pointer transition-colors">{busy ? "Đang đăng…" : "Đăng"}</button>
          </div>
        </div>

        {visible.map((p) => {
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
                    <span className="text-ink-3 text-xs">{p.time}{p.owned > 0 && ` · 🎓 ${p.owned} khóa`}{p.views ? ` · 👁 ${p.views}` : ""}</span>
                  </div>
                </Link>
              </div>
              <Link href={`/p/${p.id}`} className="block">
                <p className="text-[.96rem] mb-3 whitespace-pre-wrap hover:opacity-90">{p.body}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.image && <img src={p.image} alt="" className="rounded-[10px] w-full border border-border mb-3" />}
              </Link>
              {(p.tags && p.tags.length > 0) && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {p.tags.map((t) => <button key={t} onClick={() => setFilter(t)} className="text-xs text-accent bg-accent-weak rounded-full px-2 py-0.5 cursor-pointer">#{t}</button>)}
                </div>
              )}
              {sharedCourse && (
                <Link href={`/courses/${sharedCourse.slug}`} className="flex gap-3 items-center rounded-[10px] border border-border p-2.5 mb-3 hover:border-border-strong transition-colors">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sharedCourse.thumb} alt="" className="w-20 h-14 object-cover rounded" />
                  <div><div className="font-semibold text-sm">{sharedCourse.title}</div><div className="text-accent text-xs font-semibold">Xem khóa học →</div></div>
                </Link>
              )}
              <div className="flex gap-6 border-t border-border pt-3 text-ink-2 text-sm font-medium items-center">
                <button onClick={() => onLike(p)} className={`inline-flex gap-1.5 items-center cursor-pointer transition-colors ${isLiked ? "text-accent" : "hover:text-ink"}`}>♥ {p.likes + (isLiked ? 1 : 0)}</button>
                <button onClick={() => setOpenComments({ ...openComments, [p.id]: !openComments[p.id] })} className="inline-flex gap-1.5 items-center cursor-pointer hover:text-ink">💬 {p.comments}</button>
                <Link href={`/p/${p.id}`} className="inline-flex gap-1.5 items-center hover:text-ink ml-auto text-ink-3">↗ Xem</Link>
              </div>
              {openComments[p.id] && <PostComments postId={p.id} />}
            </div>
          );
        })}
        {visible.length === 0 && <p className="text-center text-ink-3 py-10">Chưa có bài viết nào{filter && ` cho chủ đề #${filter}`}. Hãy là người đầu tiên chia sẻ!</p>}
      </div>
    </div>
  );
}
