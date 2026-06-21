import { createAdminClient } from "@/lib/supabase/admin";
import { getYouTubeStats } from "@/lib/youtube";
import { parseVideoRef, youtubeChannelName } from "@/lib/video";
import type { Course } from "@/lib/types";

// Đồng bộ "sao đã lưu" (like YouTube live + lượt người dùng lưu) + thời lượng cho danh sách khóa.
// Cập nhật in-memory (hiện ngay) + ghi DB (giữ ổn định). getYouTubeStats đã cache 5 phút.
export async function syncCoursesSocial(courses: Course[]) {
  const admin = createAdminClient();
  if (!admin) return;
  await Promise.all(courses.map(async (c) => {
    const lessons = (c.sections || []).flatMap((s) => s.lessons);
    const ytId = lessons.map((l) => parseVideoRef(l.videoId)).find((r) => r?.kind === "youtube")?.id;
    const patch: Record<string, number> = {};

    // Thời lượng từng bài YouTube còn 0 → lấy live + ghi DB (để hàng bài hiện đúng thời gian, không phải 0:00)
    for (const l of lessons) {
      if (l.durationSec > 0) continue;
      const ref = parseVideoRef(l.videoId);
      if (ref?.kind !== "youtube") continue;
      const ls = await getYouTubeStats(ref.id);
      if (ls && ls.durationSec > 0) { l.durationSec = ls.durationSec; await admin.from("lessons").update({ duration_sec: ls.durationSec }).eq("id", l.id); }
    }
    // Tổng phút khóa = tổng thời lượng các bài
    const tm = Math.round(lessons.reduce((n, l) => n + (l.durationSec || 0), 0) / 60);
    if (tm > 0 && tm !== c.totalMinutes) { c.totalMinutes = tm; patch.total_minutes = tm; }

    if (ytId) {
      const st = await getYouTubeStats(ytId);
      const { count } = await admin.from("favorites").select("*", { count: "exact", head: true }).eq("course_slug", c.slug);
      const likes = (st?.likes || 0) + (count || 0);
      if (likes !== c.likes) { c.likes = likes; patch.likes = likes; }
      // Giảng viên trống → tự điền TÊN KÊNH YouTube (khỏi cần admin nhập / lưu lại bài)
      if (!c.instructor) {
        const ch = await youtubeChannelName(ytId);
        if (ch) { c.instructor = ch; await admin.from("courses").update({ instructor: ch }).eq("slug", c.slug); }
      }
    }
    // ⭐ luôn theo ĐÁNH GIÁ THẬT của nền tảng (chưa có đánh giá → 5.0). Tự sửa giá trị blend sót lại.
    const { data: rv } = await admin.from("reviews").select("rating").eq("course_slug", c.slug);
    const rc = (rv || []).length;
    const ravg = rc ? Math.round((rv!.reduce((s, r) => s + (r.rating as number), 0) / rc) * 10) / 10 : 5;
    if (c.rating !== ravg) { c.rating = ravg; patch.rating = ravg; }
    if (c.ratingCount !== rc) { c.ratingCount = rc; patch.rating_count = rc; }
    if (Object.keys(patch).length) await admin.from("courses").update(patch).eq("slug", c.slug);
  }));
}
