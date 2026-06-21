import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify, notifyAdmins } from "@/lib/notify";
import { getCourseBySlug } from "@/lib/courses";
import { walletChange } from "@/lib/wallet";
import { setSetting } from "@/lib/settings";
import { formatVND } from "@/lib/format";

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

  // 4) Hoàn số dư ví cho đơn bỏ dở > 48h (đánh dấu hết hạn)
  let refunded = 0;
  const { data: stale } = await admin.from("orders").select("id, user_id").eq("status", "pending").gt("wallet_used", 0).lt("created_at", iso(now - 48 * 3600_000)).limit(100);
  for (const o of stale || []) {
    const { data: txs } = await admin.from("wallet_transactions").select("kind, amount").eq("ref_order", o.id);
    for (const t of txs || []) if ((t.amount as number) < 0) await walletChange(o.user_id as string, t.kind as "credit" | "real", -(t.amount as number), "Hoàn số dư đơn hết hạn", o.id as string);
    await admin.from("orders").update({ status: "expired" }).eq("id", o.id);
    refunded++;
  }

  // 5) Tổng kết hằng ngày cho admin (1 thông báo/ngày, không spam)
  const since = iso(now - 24 * 3600_000);
  const [{ count: newUsers }, { count: newPosts }, paidOrders] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }).gt("created_at", since),
    admin.from("posts").select("*", { count: "exact", head: true }).gt("created_at", since),
    admin.from("orders").select("amount").eq("status", "paid").gt("created_at", since),
  ]);
  const ordersN = (paidOrders.data || []).length;
  const revenue = (paidOrders.data || []).reduce((s, o) => s + ((o.amount as number) || 0), 0);
  await notifyAdmins(
    "📊 Tổng kết 24h qua",
    `👤 +${newUsers || 0} học viên · 📝 +${newPosts || 0} bài cộng đồng · 🛒 ${ordersN} đơn (${formatVND(revenue)})`,
    "/admin",
  );

  // Đánh dấu cron đã chạy (để bảng sức khỏe theo dõi)
  await setSetting("cron_reminders_last", iso(now));

  return NextResponse.json({ ok: true, reminded, abandoned, nudged, refunded, digest: { newUsers, newPosts, ordersN, revenue } });
}
