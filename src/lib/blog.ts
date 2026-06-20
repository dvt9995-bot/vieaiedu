import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { BLOG } from "@/lib/mock";
import type { BlogPost } from "@/lib/types";

interface FullBlog extends BlogPost { cover?: string; sourceUrl?: string; sourceName?: string; }

function map(r: Record<string, unknown>): FullBlog {
  return {
    slug: r.slug as string,
    title: r.title as string,
    excerpt: (r.excerpt as string) || "",
    readMin: 5,
    date: r.published_at ? new Date(r.published_at as string).toLocaleDateString("vi-VN") : "",
    body: (r.body as string) || "",
    cover: (r.cover_url as string) || undefined,
    sourceUrl: (r.source_url as string) || undefined,
    sourceName: (r.source_name as string) || undefined,
  };
}

export async function getBlogPosts(): Promise<FullBlog[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase!.from("blog_posts").select("*").eq("published", true).order("published_at", { ascending: false }).limit(60);
    if (data && data.length) return data.map(map);
  }
  return BLOG.map((b) => ({ ...b }));
}

export async function getBlogPostBySlug(slug: string): Promise<FullBlog | undefined> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase!.from("blog_posts").select("*").eq("slug", slug).eq("published", true).maybeSingle();
    if (data) return map(data);
  }
  return BLOG.find((b) => b.slug === slug);
}
