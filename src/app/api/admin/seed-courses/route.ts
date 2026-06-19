import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { COURSES } from "@/lib/mock";

// Nạp catalog mẫu (6 khóa trong code) vào DB. Chỉ admin, chỉ khi DB trống.
export async function POST() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "unconfigured" }, { status: 503 });

  const { count } = await admin.from("courses").select("*", { count: "exact", head: true });
  if (count && count > 0) return NextResponse.json({ skipped: true, message: "Đã có dữ liệu, bỏ qua." });

  let inserted = 0;
  for (let i = 0; i < COURSES.length; i++) {
    const c = COURSES[i];
    const { data: course, error } = await admin.from("courses").insert({
      slug: c.slug, thumb: c.thumb, title: c.title, subtitle: c.subtitle, description: c.description,
      category: c.category, level: c.level, price: c.price, compare_price: c.comparePrice ?? null,
      total_minutes: c.totalMinutes, instructor: c.instructor, what_you_learn: c.whatYouLearn,
      rating: c.rating, rating_count: c.ratingCount, students: c.students, likes: c.likes,
      status: "published", position: i,
    }).select("id").single();
    if (error || !course) continue;
    for (let si = 0; si < c.sections.length; si++) {
      const s = c.sections[si];
      const { data: section } = await admin.from("sections")
        .insert({ course_id: course.id, title: s.title, position: si }).select("id").single();
      if (!section) continue;
      const lessonRows = s.lessons.map((l, li) => ({
        section_id: section.id, course_id: course.id, title: l.title, type: l.type,
        duration_sec: l.durationSec, is_preview: l.isPreview, video_id: l.videoId ?? null, position: li,
      }));
      await admin.from("lessons").insert(lessonRows);
    }
    inserted++;
  }
  return NextResponse.json({ ok: true, inserted });
}
