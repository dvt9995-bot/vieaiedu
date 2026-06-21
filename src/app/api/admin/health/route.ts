import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { geminiHealthCheck } from "@/lib/gemini";
import { isSepayConfigured } from "@/lib/sepay";
import { isBunnyConfigured } from "@/lib/bunny";
import { isEmailConfigured } from "@/lib/email";
import { getConfig } from "@/lib/settings";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;

  const [gemini, sepay, bunny, email, lastPost, cronBlog, cronReminders] = await Promise.all([
    geminiHealthCheck(),
    isSepayConfigured(),
    isBunnyConfigured(),
    isEmailConfigured(),
    admin.from("blog_posts").select("published_at").order("published_at", { ascending: false }).limit(1).maybeSingle(),
    getConfig("cron_blog_last"),
    getConfig("cron_reminders_last"),
  ]);

  const last = lastPost.data?.published_at as string | undefined;
  const blogStale = last ? (Date.now() - new Date(last).getTime()) > 36 * 3600 * 1000 : true;

  // Cron hằng ngày: cảnh báo nếu >26h không chạy
  const cronStat = (iso: string) => {
    if (!iso) return { ok: false, note: "Chưa ghi nhận lần chạy nào" };
    const ageH = (Date.now() - new Date(iso).getTime()) / 3600_000;
    return { ok: ageH <= 26, note: `Chạy lúc: ${formatDateTime(iso)}${ageH > 26 ? " ⚠️ quá hạn" : ""}` };
  };
  const cb = cronStat(cronBlog);
  const cr = cronStat(cronReminders);

  const services = [
    { key: "supabase", label: "Cơ sở dữ liệu (Supabase)", ok: true, note: "Hoạt động" },
    { key: "gemini", label: "AI viết blog (Gemini)", ok: gemini.ok, note: gemini.ok ? "Sẵn sàng" : (gemini.reason || "Lỗi") },
    { key: "sepay", label: "Thanh toán (SePay)", ok: sepay, note: sepay ? "Đã cấu hình" : "Chưa cấu hình" },
    { key: "bunny", label: "Video (Bunny)", ok: bunny, note: bunny ? "Đã cấu hình" : "Chưa cấu hình" },
    { key: "email", label: "Email (Resend)", ok: email, note: email ? "Đã cấu hình" : "Chưa cấu hình" },
    { key: "blog", label: "Blog tự động", ok: !blogStale, note: last ? `Bài mới nhất: ${formatDateTime(last)}` : "Chưa có bài" },
    { key: "cron_blog", label: "Cron đăng blog (hằng ngày)", ok: cb.ok, note: cb.note },
    { key: "cron_reminders", label: "Cron nhắc học & tổng kết (hằng ngày)", ok: cr.ok, note: cr.note },
  ];
  return NextResponse.json({ services });
}
