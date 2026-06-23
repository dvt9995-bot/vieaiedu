"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPurchasableCourse } from "@/lib/courses";

/** Kiểm tra user hiện tại đã ghi danh khóa chưa (server). */
export async function isEnrolled(courseSlug: string): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_slug", courseSlug)
    .maybeSingle();
  return !!data;
}

/** Ghi danh khóa miễn phí ngay (server xác thực khóa đúng là free, dùng service role). */
export async function enrollFree(courseSlug: string): Promise<{ ok: boolean; error?: string }> {
  const course = await getPurchasableCourse(courseSlug);
  if (!course || course.price !== 0) return { ok: false, error: "not_free" };
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "unconfigured" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "auth" };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "unconfigured" };
  const { error } = await admin
    .from("enrollments")
    .upsert({ user_id: user.id, course_slug: courseSlug }, { onConflict: "user_id,course_slug" });
  if (error) return { ok: false, error: error.message };
  // Khóa LIVE: gửi xác nhận kèm lịch buổi đầu (in-app + push)
  if (course.format === "live") {
    try {
      const { firstSessionLabel } = await import("@/lib/live");
      const { notify } = await import("@/lib/notify");
      const sched = await firstSessionLabel(courseSlug);
      await notify({ userId: user.id, type: "transactional", title: "Đăng ký thành công 🎉", body: `Bạn đã đăng ký lớp trực tiếp.${sched ? ` Buổi học đầu: ${sched}. Hệ thống sẽ nhắc bạn trước giờ học.` : ""}`, href: `/live/${courseSlug}`, push: true });
    } catch { /* noop */ }
  }
  return { ok: true };
}
