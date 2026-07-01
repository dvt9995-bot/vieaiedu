import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSeller } from "@/lib/shop";
import { slugify } from "@/lib/video";

const FIELDS = ["type", "title", "description", "price", "compare_price", "category_id", "stock", "media", "options", "digital_url", "digital_note", "shipping_fee", "weight", "dimensions"];
function pick(b: Record<string, unknown>) {
  const o: Record<string, unknown> = {};
  for (const f of FIELDS) if (b[f] !== undefined) o[f] = b[f];
  for (const n of ["price", "compare_price", "stock", "shipping_fee", "weight"]) if (o[n] !== undefined && o[n] !== null && o[n] !== "") o[n] = parseInt(String(o[n])) || 0; else if (o[n] === "") o[n] = null;
  // category_id là cột UUID — chuỗi rỗng "" gây lỗi insert; ép về null khi chưa chọn danh mục
  if (o.category_id === "") o.category_id = null;
  if (o.type !== undefined && o.type !== "physical") o.type = "digital";
  return o;
}

export async function GET() {
  const u = await requireSeller();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { data } = await admin.from("shop_products").select("*").eq("shop_id", u.shopId).order("created_at", { ascending: false });
  return NextResponse.json({ products: data ?? [] });
}

export async function POST(req: Request) {
  const u = await requireSeller();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const b = await req.json();
  if (!String(b.title || "").trim()) return NextResponse.json({ error: "Nhập tên sản phẩm" }, { status: 400 });
  let slug = slugify(b.title) || `sp-${Date.now()}`;
  const { data: dup } = await admin.from("shop_products").select("id").eq("slug", slug).maybeSingle();
  if (dup) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await admin.from("shop_products").insert({ ...pick(b), shop_id: u.shopId, slug, status: "draft", review_status: "pending" }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

async function ownsProduct(admin: NonNullable<ReturnType<typeof createAdminClient>>, id: string, shopId: string) {
  const { data } = await admin.from("shop_products").select("shop_id").eq("id", id).maybeSingle();
  return data?.shop_id === shopId;
}

export async function PATCH(req: Request) {
  const u = await requireSeller();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const b = await req.json();
  if (!b.id || !(await ownsProduct(admin, b.id, u.shopId))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (b.action === "submit") { await admin.from("shop_products").update({ status: "published", review_status: "pending" }).eq("id", b.id); return NextResponse.json({ ok: true }); }
  await admin.from("shop_products").update(pick(b)).eq("id", b.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const u = await requireSeller();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !(await ownsProduct(admin, id, u.shopId))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await admin.from("shop_products").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
