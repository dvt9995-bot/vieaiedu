import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import PostComments from "@/components/PostComments";
import ShareButtons from "@/components/ShareButtons";

export const dynamic = "force-dynamic";

interface Post {
  id: string; body: string; image: string | null; course_slug: string | null; created_at: string;
  tags: string[]; views: number; author_id: string; author_name: string; author_role: string;
  likes: number; comments: number;
}

async function load(id: string): Promise<Post | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase!.rpc("post_detail", { p_id: id });
  if (data) await supabase!.rpc("increment_post_view", { p_id: id });
  return (data as Post) || null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await load(id);
  if (!p) return { title: "Bài viết" };
  const title = `${p.author_name} chia sẻ trên cộng đồng VIE AI EDU`;
  const desc = p.body.slice(0, 140);
  return { title, description: desc, openGraph: { title, description: desc, images: p.image ? [p.image] : undefined } };
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await load(id);
  if (!p || !p.id) notFound();
  return (
    <div className="container-x py-12 max-w-[640px]">
      <Link href="/community" className="text-ink-3 text-sm hover:text-ink">← Về cộng đồng</Link>
      <div className="rounded-card border border-border bg-surface p-6 mt-4">
        <div className="flex items-center gap-3 mb-4">
          <Link href={`/u/${p.author_id}`} className="w-11 h-11 rounded-full bg-accent text-white grid place-items-center font-bold">{(p.author_name || "H")[0]}</Link>
          <div>
            <Link href={`/u/${p.author_id}`} className="font-semibold hover:text-accent">{p.author_name}</Link>
            <div className="text-ink-3 text-xs">{new Date(p.created_at).toLocaleDateString("vi-VN")} · 👁 {p.views} lượt xem</div>
          </div>
        </div>
        <p className="text-[1.02rem] leading-relaxed whitespace-pre-wrap">{p.body}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.image && <img src={p.image} alt="" className="rounded-xl w-full border border-border mt-4" />}
        {p.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {p.tags.map((t) => <Link key={t} href="/community" className="text-xs text-accent bg-accent-weak rounded-full px-2 py-0.5">#{t}</Link>)}
          </div>
        )}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
          <div className="text-ink-2 text-sm font-medium flex gap-5"><span>♥ {p.likes}</span><span>💬 {p.comments}</span></div>
          <ShareButtons path={`/p/${p.id}`} />
        </div>
        <PostComments postId={p.id} />
      </div>
    </div>
  );
}
