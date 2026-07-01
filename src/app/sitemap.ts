import type { MetadataRoute } from "next";
import { getCourses } from "@/lib/courses";
import { getBlogPosts } from "@/lib/blog";
import { getProducts } from "@/lib/shop";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://vieaiedu.vn";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [COURSES, BLOG, PRODUCTS] = await Promise.all([getCourses(), getBlogPosts(), getProducts().catch(() => [])]);
  const staticRoutes = ["", "/courses", "/live", "/shop", "/community", "/blog", "/gioi-thieu", "/leaderboard", "/privacy", "/terms"].map((p) => ({
    url: `${BASE}${p}`,
    changeFrequency: "daily" as const,
    priority: p === "" ? 1 : 0.8,
  }));
  const courseRoutes = COURSES.map((c) => ({
    url: `${BASE}/courses/${c.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
  const blogRoutes = BLOG.map((b) => ({
    url: `${BASE}/blog/${b.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  const productRoutes = PRODUCTS.map((p) => ({
    url: `${BASE}/shop/p/${p.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  return [...staticRoutes, ...courseRoutes, ...blogRoutes, ...productRoutes];
}
