"use client";
import { createClient } from "@/lib/supabase/client";
import { POSTS } from "@/lib/mock";

// Lớp truy cập dữ liệu phía client. Mỗi hàm tự fallback localStorage/mock
// khi chưa cấu hình Supabase hoặc chưa đăng nhập → app luôn chạy.

async function sb() {
  const c = createClient();
  if (!c) return null;
  const { data } = await c.auth.getUser();
  return data.user ? { c, uid: data.user.id } : null;
}

// ---------- PROGRESS ----------
const pKey = (slug: string) => `vieaiedu:progress:${slug}`;

export async function loadProgress(slug: string): Promise<{ done: string[]; positions: Record<string, number> }> {
  const s = await sb();
  if (s) {
    const { data } = await s.c.from("lesson_progress").select("lesson_id, completed, last_position_sec").eq("user_id", s.uid).eq("course_slug", slug);
    if (data) {
      const done = data.filter((r) => r.completed).map((r) => r.lesson_id as string);
      const positions: Record<string, number> = {};
      data.forEach((r) => (positions[r.lesson_id as string] = r.last_position_sec as number));
      return { done, positions };
    }
  }
  try { const p = JSON.parse(localStorage.getItem(pKey(slug)) || "{}"); return { done: p.done || [], positions: p.positions || {} }; }
  catch { return { done: [], positions: {} }; }
}

export async function saveLesson(slug: string, lessonId: string, completed: boolean, positionSec = 0) {
  const s = await sb();
  if (s) {
    await s.c.from("lesson_progress").upsert(
      { user_id: s.uid, course_slug: slug, lesson_id: lessonId, completed, last_position_sec: positionSec },
      { onConflict: "user_id,lesson_id" }
    );
    return;
  }
  try {
    const p = JSON.parse(localStorage.getItem(pKey(slug)) || "{}");
    const done = new Set<string>(p.done || []);
    completed ? done.add(lessonId) : done.delete(lessonId);
    const positions = p.positions || {}; positions[lessonId] = positionSec;
    localStorage.setItem(pKey(slug), JSON.stringify({ done: [...done], positions }));
  } catch {}
}

// ---------- NOTES ----------
const nKey = (slug: string) => `vieaiedu:notes:${slug}`;
export interface DBNote { lessonId: string; t: number; body: string; }

export async function loadNotes(slug: string, lessonIds: string[]): Promise<DBNote[]> {
  const s = await sb();
  if (s) {
    const { data } = await s.c.from("notes").select("lesson_id, timestamp_sec, body").eq("user_id", s.uid).in("lesson_id", lessonIds).order("timestamp_sec");
    if (data) return data.map((r) => ({ lessonId: r.lesson_id as string, t: r.timestamp_sec as number, body: r.body as string }));
  }
  try { return JSON.parse(localStorage.getItem(nKey(slug)) || "[]"); } catch { return []; }
}

export async function addNote(slug: string, note: DBNote, all: DBNote[]) {
  const s = await sb();
  if (s) { await s.c.from("notes").insert({ user_id: s.uid, lesson_id: note.lessonId, timestamp_sec: note.t, body: note.body }); return; }
  try { localStorage.setItem(nKey(slug), JSON.stringify(all)); } catch {}
}

// ---------- QUIZ ----------
export async function saveQuizAttempt(quizKey: string, score: number, passed: boolean) {
  const s = await sb();
  if (s) await s.c.from("quiz_attempts").insert({ user_id: s.uid, quiz_key: quizKey, score, passed });
}

// ---------- FAVORITES ----------
const fKey = "vieaiedu:favorites";
export async function loadFavorites(): Promise<string[]> {
  const s = await sb();
  if (s) { const { data } = await s.c.from("favorites").select("course_slug").eq("user_id", s.uid); if (data) return data.map((r) => r.course_slug as string); }
  try { return JSON.parse(localStorage.getItem(fKey) || "[]"); } catch { return []; }
}
// Cache danh sách yêu thích trong 1 lần tải trang (tránh gọi DB lặp ở mỗi thẻ khóa)
let favCache: Promise<string[]> | null = null;
export function favoritesCached(): Promise<string[]> {
  if (!favCache) favCache = loadFavorites();
  return favCache;
}
export function invalidateFavorites() { favCache = null; }

export async function toggleFavorite(slug: string, on: boolean) {
  const s = await sb();
  if (s) {
    if (on) await s.c.from("favorites").upsert({ user_id: s.uid, course_slug: slug }, { onConflict: "user_id,course_slug" });
    else await s.c.from("favorites").delete().eq("user_id", s.uid).eq("course_slug", slug);
    return;
  }
  try {
    const cur = new Set<string>(JSON.parse(localStorage.getItem(fKey) || "[]"));
    on ? cur.add(slug) : cur.delete(slug);
    localStorage.setItem(fKey, JSON.stringify([...cur]));
  } catch {}
}

// ---------- COMMUNITY ----------
export interface DBPost {
  id: string; authorId?: string; author: string; avatarColor: string; time: string; body: string;
  image?: string; courseSlug?: string; likes: number; comments: number; owned: number; role?: string;
  tags?: string[]; views?: number;
}
const COLORS = ["#e41e26", "#202124", "#f4b400"];

export async function loadPosts(): Promise<DBPost[]> {
  const c = createClient();
  if (c) {
    const { data } = await c.rpc("community_feed", { lim: 50 });
    if (data) return (data as Record<string, unknown>[]).map((p, i) => ({
      id: p.id as string,
      authorId: (p.author_id as string) || undefined,
      author: (p.author_name as string) || "Học viên",
      avatarColor: COLORS[i % 3],
      time: new Date(p.created_at as string).toLocaleDateString("vi-VN"),
      body: p.body as string,
      image: (p.image_url as string) || undefined,
      courseSlug: (p.course_slug as string) || undefined,
      likes: Number(p.likes) || 0,
      comments: Number(p.comments) || 0,
      owned: Number(p.owned) || 0,
      role: p.author_role as string,
      tags: (p.tags as string[]) || [],
      views: Number(p.views) || 0,
    }));
  }
  return POSTS.map((p) => ({ ...p, owned: 0 })) as unknown as DBPost[];
}

export async function communityStats(): Promise<{ students: number; enrollments: number; certificates: number; posts: number } | null> {
  const c = createClient();
  if (!c) return null;
  const { data } = await c.rpc("community_stats");
  return (data as { students: number; enrollments: number; certificates: number; posts: number }) || null;
}

/** Upload ảnh bài cộng đồng lên Storage, trả public URL. */
export async function uploadCommunityImage(file: File): Promise<string | null> {
  const s = await sb();
  if (!s) return null;
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${s.uid}/${Date.now()}.${ext}`;
  const { error } = await s.c.storage.from("community").upload(path, file, { upsert: true });
  if (error) return null;
  return s.c.storage.from("community").getPublicUrl(path).data.publicUrl;
}

export async function createPost(body: string, imageUrl?: string | null, courseSlug?: string | null, tags?: string[]): Promise<boolean> {
  const s = await sb();
  if (!s) return false;
  const { error } = await s.c.from("posts").insert({ author_id: s.uid, body, image_url: imageUrl ?? null, course_slug: courseSlug ?? null, tags: tags ?? [] });
  return !error;
}

export async function incrementPostView(postId: string) {
  const c = createClient();
  if (c) await c.rpc("increment_post_view", { p_id: postId });
}

export async function togglePostLike(postId: string, on: boolean) {
  const s = await sb();
  if (!s) return;
  if (on) await s.c.from("post_likes").upsert({ post_id: postId, user_id: s.uid }, { onConflict: "post_id,user_id" });
  else await s.c.from("post_likes").delete().eq("post_id", postId).eq("user_id", s.uid);
}

export interface DBComment { id: string; body: string; author: string; time: string; }
export async function loadComments(postId: string): Promise<DBComment[]> {
  const c = createClient();
  if (!c) return [];
  const { data } = await c.from("comments").select("id, body, created_at, profiles(full_name)").eq("post_id", postId).order("created_at");
  return (data || []).map((x) => ({ id: x.id as string, body: x.body as string, author: (x as { profiles?: { full_name?: string } }).profiles?.full_name || "Học viên", time: new Date(x.created_at as string).toLocaleDateString("vi-VN") }));
}
export async function addComment(postId: string, body: string): Promise<boolean> {
  const s = await sb();
  if (!s) return false;
  const { error } = await s.c.from("comments").insert({ post_id: postId, author_id: s.uid, body });
  return !error;
}

export async function currentUserId(): Promise<string | null> {
  const s = await sb();
  return s?.uid ?? null;
}

export function isConfigured() {
  return !!createClient();
}
