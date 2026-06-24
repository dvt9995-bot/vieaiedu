import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAdmins } from "@/lib/notify";

async function uid() {
  const s = await createClient(); if (!s) return null;
  const { data: { user } } = await s.auth.getUser(); return user?.id || null;
}

// Đơn của TÔI (người mua)
export async function GET() {
  const u = await uid();
  if (!u) return NextResponse.json({ error: "auth" }, { status: 401 });
  const admin = createAdminClient()!;
  const { data } = await admin.from("shop_orders").select("*, shops(name, slug), shop_order_items(*)").eq("buyer_id", u).order("created_at", { ascending: false }).limit(100);
  // Chỉ lộ link/hướng dẫn sản phẩm SỐ khi đơn ĐÃ thanh toán (chống tải chùa khi chưa trả tiền)
  const orders = (data ?? []).map((o) => {
    const paid = ["paid", "shipped", "delivered", "completed"].includes(o.status as string);
    const items = ((o.shop_order_items as Record<string, unknown>[]) || []).map((it) => paid ? it : { ...it, digital_url: null, digital_note: null });
    return { ...o, shop_order_items: items };
  });
  return NextResponse.json({ orders });
}

// Hành động của người mua: xác nhận đã nhận / mở khiếu nại
export async function POST(req: Request) {
  const u = await uid();
  if (!u) return NextResponse.json({ error: "auth" }, { status: 401 });
  const admin = createAdminClient()!;
  const { id, action, reason } = await req.json();
  const { data: o } = await admin.from("shop_orders").select("id, buyer_id, status, escrow_status").eq("id", id).maybeSingle();
  if (!o || o.buyer_id !== u) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (action === "confirm") {
    if (o.escrow_status !== "held") return NextResponse.json({ error: "Đơn không ở trạng thái chờ" }, { status: 400 });
    // Xác nhận đã nhận → giải ngân ngay ở lần cron gần nhất
    await admin.from("shop_orders").update({ status: "delivered", delivered_at: new Date().toISOString(), release_at: new Date().toISOString() }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  if (action === "dispute") {
    if (!["paid", "shipped", "delivered"].includes(o.status as string) || o.escrow_status !== "held") return NextResponse.json({ error: "Không thể khiếu nại đơn này" }, { status: 400 });
    await admin.from("shop_disputes").insert({ order_id: id, buyer_id: u, reason: String(reason || "").slice(0, 1000) || "Khiếu nại đơn hàng" });
    await admin.from("shop_orders").update({ status: "disputed" }).eq("id", id);
    await notifyAdmins("⚠️ Khiếu nại đơn hàng sàn", `Đơn ${String(id).slice(0, 8)} có khiếu nại. Cần xử lý.`, "/admin", { email: true });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "bad action" }, { status: 400 });
}
