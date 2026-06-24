import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { slugify } from "@/lib/video";

export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { data } = await admin.from("shop_categories").select("*").order("position");
  return NextResponse.json({ categories: data ?? [] });
}

export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const b = await req.json();
  if (!String(b.name || "").trim()) return NextResponse.json({ error: "Nhập tên danh mục" }, { status: 400 });
  const slug = slugify(b.name) || `dm-${Date.now()}`;
  const { error } = await admin.from("shop_categories").insert({ name: b.name, slug, fee_percent: Number(b.fee_percent) || 10, position: Number(b.position) || 0 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { id, fee_percent, name, position } = await req.json();
  const patch: Record<string, unknown> = {};
  if (fee_percent !== undefined) patch.fee_percent = Number(fee_percent) || 0;
  if (name !== undefined) patch.name = name;
  if (position !== undefined) patch.position = Number(position) || 0;
  await admin.from("shop_categories").update(patch).eq("id", id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const id = new URL(req.url).searchParams.get("id");
  await admin.from("shop_categories").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
