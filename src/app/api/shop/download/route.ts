import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Tải sản phẩm số AN TOÀN: chỉ người đã MUA (đơn đã thanh toán) — trả link ký có hạn 10 phút.
export async function GET(req: Request) {
  const itemId = new URL(req.url).searchParams.get("item");
  if (!itemId) return NextResponse.json({ error: "missing" }, { status: 400 });
  const s = await createClient();
  if (!s) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const admin = createAdminClient()!;
  const { data: it } = await admin.from("shop_order_items").select("digital_url, type, order_id, shop_orders!inner(buyer_id, status)").eq("id", itemId).maybeSingle();
  const ord = it?.shop_orders as { buyer_id?: string; status?: string } | undefined;
  if (!it || ord?.buyer_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!["paid", "shipped", "delivered", "completed"].includes(ord?.status || "")) return NextResponse.json({ error: "Đơn chưa thanh toán" }, { status: 402 });
  const url = it.digital_url as string | null;
  if (!url) return NextResponse.json({ error: "Sản phẩm chưa có file" }, { status: 404 });
  if (url.startsWith("file:")) {
    const path = url.slice(5);
    const { data, error } = await admin.storage.from("shopfiles").createSignedUrl(path, 600, { download: true });
    if (error || !data?.signedUrl) return NextResponse.json({ error: "Không tạo được link tải" }, { status: 500 });
    return NextResponse.redirect(data.signedUrl);
  }
  return NextResponse.redirect(/^https?:\/\//i.test(url) ? url : `https://${url}`);
}
