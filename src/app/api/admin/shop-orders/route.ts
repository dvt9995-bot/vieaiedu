import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { fulfillShopGroupByCode } from "@/lib/fulfill";

// Danh sách đơn sàn (admin) — mặc định đơn CHỜ thanh toán để xác nhận tay khi webhook quá giờ.
export async function GET(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const status = new URL(req.url).searchParams.get("status") || "pending";
  let q = admin.from("shop_orders")
    .select("id, code, buyer_id, shop_id, total, status, has_physical, created_at, shops(name), profiles(full_name), shop_order_items(title, qty)")
    .order("created_at", { ascending: false }).limit(100);
  if (status !== "all") q = q.eq("status", status);
  const { data } = await q;
  return NextResponse.json({ orders: data ?? [] });
}

// POST {code, action:"mark_paid"} — xác nhận tay đã nhận tiền cho CẢ nhóm đơn chung mã.
// Chạy y hệt webhook: giữ escrow + ghi sổ + trừ kho + báo người mua & người bán.
export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { code, action } = await req.json().catch(() => ({}));
  if (!code || action !== "mark_paid") return NextResponse.json({ error: "Tham số sai" }, { status: 400 });
  const done = await fulfillShopGroupByCode(admin, String(code).toUpperCase());
  if (!done) return NextResponse.json({ error: "Không có đơn chờ thanh toán với mã này (có thể đã xử lý)" }, { status: 409 });
  return NextResponse.json({ ok: true, done });
}
