import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

// Việc cần admin xử lý + hoạt động 24h qua (cho panel "Cần xử lý").
export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const cnt = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count || 0);

  const [withdrawals, orders, posts, users, errors] = await Promise.all([
    cnt(admin.from("withdrawals").select("*", { count: "exact", head: true }).eq("status", "pending")),
    cnt(admin.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending")),
    cnt(admin.from("posts").select("*", { count: "exact", head: true }).gt("created_at", since)),
    cnt(admin.from("profiles").select("*", { count: "exact", head: true }).gt("created_at", since)),
    cnt(admin.from("error_logs").select("*", { count: "exact", head: true }).gt("created_at", since)),
  ]);

  return NextResponse.json({
    items: [
      { key: "withdrawals", label: "Yêu cầu rút tiền chờ duyệt", count: withdrawals, href: "/admin?tab=withdraw", urgent: withdrawals > 0 },
      { key: "orders", label: "Đơn hàng đang chờ thanh toán", count: orders, href: "/admin", urgent: false },
      { key: "posts", label: "Bài cộng đồng mới (24h)", count: posts, href: "/admin?tab=community", urgent: false },
      { key: "users", label: "Học viên mới (24h)", count: users, href: "/admin?tab=users", urgent: false },
      { key: "errors", label: "Lỗi giao diện ghi nhận (24h)", count: errors, href: "/admin", urgent: errors > 0 },
    ],
  });
}
