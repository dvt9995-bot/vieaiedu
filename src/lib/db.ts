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
export interface DBPost { id: string; author: string; avatarColor: string; time: string; body: string; image?: string; likes: number; comments: number; liked?: boolean; }

export async function loadPosts(): Promise<DBPost[]> {
  const c = createClient();
  if (c) {
    const { data } = await c.from("posts").select("id, body, image_url, created_at, profiles(full_name)").order("created_at", { ascending: false }).limit(50);
    if (data) {
      return data.map((p, i) => ({
        id: p.id as string,
        author: (p as { profiles?: { full_name?: string } }).profiles?.full_name || "Học viên",
        avatarColor: ["#e41e26", "#202124", "#f4b400"][i % 3],
        time: new Date(p.created_at as string).toLocaleDateString("vi-VN"),
        body: p.body as string,
        image: (p.image_url as string) || undefined,
        likes: 0, comments: 0,
      }));
    }
  }
  return POSTS as unknown as DBPost[];
}

export async function createPost(body: string): Promise<boolean> {
  const s = await sb();
  if (!s) return false;
  const { error } = await s.c.from("posts").insert({ author_id: s.uid, body });
  return !error;
}

export async function togglePostLike(postId: string, on: boolean) {
  const s = await sb();
  if (!s) return;
  if (on) await s.c.from("post_likes").upsert({ post_id: postId, user_id: s.uid }, { onConflict: "post_id,user_id" });
  else await s.c.from("post_likes").delete().eq("post_id", postId).eq("user_id", s.uid);
}

export function isConfigured() {
  return !!createClient();
}
