import { unstable_cache } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BLOG } from "@/lib/mock";
import type { BlogPost } from "@/lib/types";

interface FullBlog extends BlogPost { id?: string; cover?: string; images?: string[]; sourceUrl?: string; sourceName?: string; }

function map(r: Record<string, unknown>): FullBlog {
  return {
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    excerpt: (r.excerpt as string) || "",
    readMin: 5,
    date: r.published_at ? new Date(r.published_at as string).toLocaleDateString("vi-VN") : "",
    body: (r.body as string) || "",
    cover: (r.cover_url as string) || undefined,
    images: (r.images as string[]) || [],
    sourceUrl: (r.source_url as string) || undefined,
    sourceName: (r.source_name as string) || undefined,
  };
}

export async function getRelatedPosts(slug: string, n = 3): Promise<FullBlog[]> {
  const all = await getBlogPosts();
  return all.filter((b) => b.slug !== slug).slice(0, n);
}

// Cache danh sách blog 10 phút (tag "blog" để làm mới khi admin sửa / cron đăng).
export const getBlogPosts = unstable_cache(
  async (): Promise<FullBlog[]> => {
    const admin = createAdminClient();
    if (admin) {
      const { data } = await admin.from("blog_posts").select("*").eq("published", true).order("published_at", { ascending: false }).limit(60);
      if (data && data.length) return data.map(map);
    }
    return BLOG.map((b) => ({ ...b }));
  },
  ["blog-posts"],
  { revalidate: 600, tags: ["blog"] },
);

export async function getBlogPostBySlug(slug: string): Promise<FullBlog | undefined> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase!.from("blog_posts").select("*").eq("slug", slug).eq("published", true).maybeSingle();
    if (data) return map(data);
  }
  return BLOG.find((b) => b.slug === slug);
}
