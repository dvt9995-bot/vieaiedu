import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { notify } from "@/lib/notify";

// Sản phẩm chờ duyệt (và tất cả nếu ?all=1)
export async function GET(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const all = new URL(req.url).searchParams.get("all");
  let q = admin.from("shop_products").select("id, title, slug, type, price, status, review_status, shop_id, shops(name, owner_id)").order("created_at", { ascending: false });
  if (!all) q = q.eq("review_status", "pending").eq("status", "published");
  const { data } = await q;
  return NextResponse.json({ products: data ?? [] });
}

export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { id, action, note } = await req.json();
  const { data: p } = await admin.from("shop_products").select("title, shops(owner_id)").eq("id", id).maybeSingle();
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  const owner = (p.shops as { owner_id?: string } | null)?.owner_id;
  if (action === "approve") {
    await admin.from("shop_products").update({ review_status: "approved", status: "published", review_note: null }).eq("id", id);
    if (owner) await notify({ userId: owner, type: "system", title: "✅ Sản phẩm đã được duyệt", body: `"${p.title}" đã lên sàn.`, href: "/seller", push: true });
  } else {
    await admin.from("shop_products").update({ review_status: "rejected", review_note: note || null }).eq("id", id);
    if (owner) await notify({ userId: owner, type: "system", title: "Sản phẩm cần chỉnh sửa", body: note || "Xem góp ý và gửi duyệt lại.", href: "/seller" });
  }
  return NextResponse.json({ ok: true });
}
