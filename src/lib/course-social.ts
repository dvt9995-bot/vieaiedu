import { createAdminClient } from "@/lib/supabase/admin";
import { getYouTubeStats } from "@/lib/youtube";
import { parseVideoRef } from "@/lib/video";
import type { Course } from "@/lib/types";

// Đồng bộ "sao đã lưu" (like YouTube live + lượt người dùng lưu) + thời lượng cho danh sách khóa.
// Cập nhật in-memory (hiện ngay) + ghi DB (giữ ổn định). getYouTubeStats đã cache 5 phút.
export async function syncCoursesSocial(courses: Course[]) {
  const admin = createAdminClient();
  if (!admin) return;
  await Promise.all(courses.map(async (c) => {
    const ytId = c.sections?.flatMap((s) => s.lessons).map((l) => parseVideoRef(l.videoId)).find((r) => r?.kind === "youtube")?.id;
    if (!ytId) return;
    const st = await getYouTubeStats(ytId);
    if (!st) return;
    const { count } = await admin.from("favorites").select("*", { count: "exact", head: true }).eq("course_slug", c.slug);
    const likes = (st.likes || 0) + (count || 0);
    const patch: Record<string, number> = {};
    if (likes !== c.likes) { c.likes = likes; patch.likes = likes; }
    // Khóa 1 video chưa có tổng phút → lấy luôn từ thời lượng video
    if (c.totalMinutes === 0 && st.durationSec > 0) { c.totalMinutes = Math.round(st.durationSec / 60); patch.total_minutes = c.totalMinutes; }
    // ⭐ luôn theo ĐÁNH GIÁ THẬT của nền tảng (chưa có đánh giá → 5.0). Tự sửa giá trị blend sót lại.
    const { data: rv } = await admin.from("reviews").select("rating").eq("course_slug", c.slug);
    const rc = (rv || []).length;
    const ravg = rc ? Math.round((rv!.reduce((s, r) => s + (r.rating as number), 0) / rc) * 10) / 10 : 5;
    if (c.rating !== ravg) { c.rating = ravg; patch.rating = ravg; }
    if (c.ratingCount !== rc) { c.ratingCount = rc; patch.rating_count = rc; }
    if (Object.keys(patch).length) await admin.from("courses").update(patch).eq("slug", c.slug);
  }));
}
