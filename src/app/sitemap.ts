import type { MetadataRoute } from "next";
import { BLOG } from "@/lib/mock";
import { getCourses } from "@/lib/courses";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://vieaiedu.vn";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const COURSES = await getCourses();
  const staticRoutes = ["", "/courses", "/community", "/blog"].map((p) => ({
    url: `${BASE}${p}`,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.8,
  }));
  const courseRoutes = COURSES.map((c) => ({
    url: `${BASE}/courses/${c.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
  const blogRoutes = BLOG.map((b) => ({
    url: `${BASE}/blog/${b.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  return [...staticRoutes, ...courseRoutes, ...blogRoutes];
}
