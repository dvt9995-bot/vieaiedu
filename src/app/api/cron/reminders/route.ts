import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";
import { getCourseBySlug } from "@/lib/courses";

// Cron hằng ngày: nhắc học + email marketing tự động (bỏ giỏ, nhắc người mới).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "unconfigured" }, { status: 503 });

  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();

  // 1) Nhắc học viên lâu không vào học
  const { data } = await admin.rpc("inactive_learners", { days: 3 });
  let reminded = 0;
  for (const u of ((data as { user_id: string }[]) || []).slice(0, 300)) {
    await notify({ userId: u.user_id, type: "learning", title: "Tiếp tục hành trình AI của bạn 📚", body: "Bạn có khóa học đang dang dở. Quay lại học hôm nay nhé!", href: "/dashboard", email: false });
    reminded++;
  }

  // 2) Email "bỏ giỏ": đơn pending 1–48h, chưa nhắc
  let abandoned = 0;
  const { data: orders } = await admin.from("orders").select("id, user_id, course_slug, amount")
    .eq("status", "pending").is("reminded_at", null)
    .lt("created_at", iso(now - 3600_000)).gt("created_at", iso(now - 48 * 3600_000)).limit(200);
  for (const o of orders || []) {
    const course = await getCourseBySlug(o.course_slug as string);
    await notify({
      userId: o.user_id as string, type: "transactional",
      title: "Hoàn tất đăng ký khóa học của bạn 🎓",
      body: `Bạn còn một bước nữa để sở hữu khóa "${course?.title ?? o.course_slug}". Hoàn tất thanh toán để bắt đầu học ngay!`,
      href: `/courses/${o.course_slug}`, email: true,
    });
    await admin.from("orders").update({ reminded_at: iso(now) }).eq("id", o.id);
    abandoned++;
  }

  // 3) Nhắc người mới (2–4 ngày, chưa ghi danh, chưa nhắc)
  let nudged = 0;
  const { data: news } = await admin.from("profiles").select("id")
    .is("nudged_at", null).lt("created_at", iso(now - 2 * 86400_000)).gt("created_at", iso(now - 4 * 86400_000)).limit(200);
  for (const p of news || []) {
    const { count } = await admin.from("enrollments").select("*", { count: "exact", head: true }).eq("user_id", p.id);
    if (!count) {
      await notify({ userId: p.id as string, type: "promo", title: "Bắt đầu học AI miễn phí hôm nay ✨", body: "Khám phá các khóa học AI miễn phí và cộng đồng VIE AI EDU dành cho bạn.", href: "/courses", email: true });
      nudged++;
    }
    await admin.from("profiles").update({ nudged_at: iso(now) }).eq("id", p.id);
  }

  return NextResponse.json({ ok: true, reminded, abandoned, nudged });
}
