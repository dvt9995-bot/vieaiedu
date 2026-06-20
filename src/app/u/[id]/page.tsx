import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Profile {
  id: string; name: string; avatar: string | null; bio: string | null; role: string;
  code: string | null; joined: string; courses: number; certificates: number; completed: number;
  profile_views: number; interests: string[];
  posts: { id: string; body: string; image: string | null; created_at: string }[];
}

async function load(id: string, count = false): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase!.rpc("public_profile", { p_id: id });
  if (data && count) await supabase!.rpc("increment_profile_view", { p_id: id });
  return (data as Profile) || null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await load(id);
  return { title: p ? `${p.name} — Hồ sơ học viên` : "Hồ sơ" };
}

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await load(id, true);
  if (!p || !p.id) notFound();
  const roleLabel = p.role === "admin" ? "Quản trị viên" : p.role === "instructor" ? "Giảng viên" : "Học viên";
  const joined = p.joined ? new Date(p.joined).toLocaleDateString("vi-VN", { month: "long", year: "numeric" }) : "";

  return (
    <div className="container-x py-12 max-w-[760px]">
      {/* Header hồ sơ */}
      <div className="rounded-card border border-border bg-surface overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-accent to-accent-700" />
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-12">
            <div className="w-24 h-24 rounded-full ring-4 ring-surface bg-bg-soft overflow-hidden flex items-center justify-center text-3xl font-extrabold text-accent">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.avatar ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" /> : p.name[0]}
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight">{p.name}</h1>
                {p.role === "admin" && <span className="text-[10px] font-bold text-white bg-accent px-1.5 py-0.5 rounded">BQT</span>}
                {p.role === "instructor" && <span className="text-[10px] font-bold text-accent bg-accent-weak px-1.5 py-0.5 rounded">Giảng viên</span>}
              </div>
              <div className="text-ink-3 text-sm">{roleLabel}{p.code && ` · ${p.code}`}</div>
            </div>
          </div>
          {p.bio && <p className="text-ink-2 mt-4">{p.bio}</p>}
          <p className="text-ink-3 text-sm mt-2">{joined && `📅 Tham gia từ ${joined}`}{p.profile_views ? ` · 👁 ${p.profile_views} lượt xem hồ sơ` : ""}</p>
          {p.interests?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {p.interests.map((t) => <span key={t} className="text-xs text-accent bg-accent-weak rounded-full px-2 py-0.5">#{t}</span>)}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mt-5">
            {[["Khóa học", p.courses], ["Chứng chỉ", p.certificates], ["Bài hoàn thành", p.completed]].map(([l, v]) => (
              <div key={l as string} className="rounded-card border border-border bg-bg-soft p-3 text-center">
                <div className="text-xl font-extrabold text-accent">{v as number}</div>
                <div className="text-ink-3 text-xs">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bài đăng */}
      <h2 className="font-bold text-lg mt-8 mb-3">Bài đăng cộng đồng</h2>
      {p.posts.length === 0 ? (
        <p className="text-ink-3">Chưa có bài đăng nào.</p>
      ) : (
        <div className="space-y-3">
          {p.posts.map((post) => (
            <div key={post.id} className="rounded-card border border-border bg-surface p-4">
              <div className="text-ink-3 text-xs mb-2">{new Date(post.created_at).toLocaleDateString("vi-VN")}</div>
              <p className="text-[.96rem] whitespace-pre-wrap">{post.body}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {post.image && <img src={post.image} alt="" className="rounded-[10px] w-full border border-border mt-3" />}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8"><Link href="/community" className="text-accent font-semibold text-sm">← Về cộng đồng</Link></div>
    </div>
  );
}
