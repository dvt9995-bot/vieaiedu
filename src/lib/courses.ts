import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { COURSES as MOCK } from "@/lib/mock";
import type { Course, Level } from "@/lib/types";

type Row = Record<string, unknown>;

function mapCourse(c: Row): Course {
  const sections = ((c.sections as Row[]) || [])
    .slice()
    .sort((a, b) => (a.position as number) - (b.position as number))
    .map((s) => ({
      id: s.id as string,
      title: s.title as string,
      lessons: ((s.lessons as Row[]) || [])
        .slice()
        .sort((a, b) => (a.position as number) - (b.position as number))
        .map((l) => ({
          id: l.id as string,
          title: l.title as string,
          type: (l.type as Course["sections"][0]["lessons"][0]["type"]) || "video",
          durationSec: (l.duration_sec as number) || 0,
          isPreview: !!l.is_preview,
          videoId: (l.video_id as string) || undefined,
        })),
    }));
  const lessonsCount = sections.reduce((n, s) => n + s.lessons.length, 0);
  return {
    id: c.id as string,
    slug: c.slug as string,
    thumb: (c.thumb as string) || "/courses/default.jpg",
    title: c.title as string,
    subtitle: (c.subtitle as string) || "",
    description: (c.description as string) || "",
    category: (c.category as string) || "Khác",
    level: ((c.level as Level) || "beginner"),
    price: (c.price as number) || 0,
    comparePrice: (c.compare_price as number) || undefined,
    totalMinutes: (c.total_minutes as number) || 0,
    lessonsCount: lessonsCount || (c.lessons_count as number) || 0,
    rating: Number(c.rating ?? 5),
    ratingCount: (c.rating_count as number) || 0,
    students: (c.students as number) || 0,
    likes: (c.likes as number) || 0,
    instructor: (c.instructor as string) || "Long Nam",
    sections,
    whatYouLearn: ((c.what_you_learn as string[]) || []),
    seoTitle: (c.seo_title as string) || undefined,
    seoDescription: (c.seo_description as string) || undefined,
  };
}

// Dùng service role (không cookie) để có thể cache. Catalog là dữ liệu công khai.
async function fromDB(): Promise<Course[] | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("courses")
    .select("*, sections(*, lessons(*))")
    .eq("status", "published")
    .order("position", { ascending: true });
  if (error || !data || data.length === 0) return null; // chưa seed → fallback mock
  return data.map(mapCourse);
}

// Cache toàn bộ catalog 5 phút (tag "courses" để admin sửa là làm mới ngay).
const cachedCourses = unstable_cache(
  async (): Promise<Course[]> => (await fromDB()) ?? MOCK,
  ["courses-all"],
  { revalidate: 300, tags: ["courses"] },
);

export async function getCourses(): Promise<Course[]> {
  return cachedCourses();
}

export async function getCourseBySlug(slug: string): Promise<Course | undefined> {
  return (await cachedCourses()).find((c) => c.slug === slug);
}
