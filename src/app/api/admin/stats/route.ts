import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";

export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const [overview, revenue, signups, top, dons, enrollCount, certCount] = await Promise.all([
    admin.rpc("admin_overview"),
    admin.rpc("revenue_by_day", { days: 30 }),
    admin.rpc("signups_by_day", { days: 30 }),
    admin.rpc("top_courses"),
    admin.from("donations").select("amount, paid_at").eq("status", "paid"),
    admin.from("enrollments").select("*", { count: "exact", head: true }),   // tổng lượt ghi danh
    admin.from("certificates").select("*", { count: "exact", head: true }),  // tổng chứng chỉ đã cấp
  ]);

  // Cộng ỦNG HỘ vào doanh thu
  const list = (dons.data ?? []) as { amount: number; paid_at: string }[];
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const donTotal = list.reduce((s, d) => s + (d.amount || 0), 0);
  const donMonth = list.filter((d) => new Date(d.paid_at) >= monthStart).reduce((s, d) => s + (d.amount || 0), 0);
  const ov: Record<string, number> = { ...(overview.data ?? {}) };
  ov.revenue = (ov.revenue || 0) + donTotal;
  ov.revenue_month = (ov.revenue_month || 0) + donMonth;
  ov.donations = donTotal;
  // North Star: học tập THỰC CHẤT (không phải lượt xem)
  ov.enrollments = enrollCount.count || 0;
  ov.certificates = certCount.count || 0;
  ov.completion_rate = ov.enrollments > 0 ? Math.round((ov.certificates / ov.enrollments) * 100) : 0;

  // Gộp ủng hộ vào biểu đồ doanh thu theo ngày (giờ VN)
  const byDay: Record<string, number> = {};
  for (const d of list) { const k = new Date(d.paid_at).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }); byDay[k] = (byDay[k] || 0) + (d.amount || 0); }
  const rev = ((revenue.data ?? []) as { d: string; total: number }[]).map((r) => ({ ...r, total: r.total + (byDay[r.d] || 0) }));

  return NextResponse.json({ overview: ov, revenue: rev, signups: signups.data ?? [], top: top.data ?? [] });
}
