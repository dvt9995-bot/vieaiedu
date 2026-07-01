import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Bật/tắt yêu thích sản phẩm. POST {product_id} → {favorited}
export async function POST(req: Request) {
  const s = await createClient();
  if (!s) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { product_id } = await req.json().catch(() => ({}));
  if (!product_id) return NextResponse.json({ error: "missing" }, { status: 400 });
  const admin = createAdminClient()!;
  const { data: ex } = await admin.from("shop_favorites").select("product_id").eq("user_id", user.id).eq("product_id", product_id).maybeSingle();
  if (ex) { await admin.from("shop_favorites").delete().eq("user_id", user.id).eq("product_id", product_id); return NextResponse.json({ favorited: false }); }
  await admin.from("shop_favorites").insert({ user_id: user.id, product_id });
  return NextResponse.json({ favorited: true });
}
