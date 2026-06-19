import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";

const FIELDS = ["slug", "title", "subtitle", "description", "category", "level", "price", "compare_price", "thumb", "status", "instructor", "total_minutes"];

function pick(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of FIELDS) if (body[f] !== undefined) out[f] = body[f];
  if (typeof out.price === "string") out.price = parseInt(out.price as string) || 0;
  if (typeof out.compare_price === "string") out.compare_price = parseInt(out.compare_price as string) || null;
  return out;
}

export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { data } = await admin.from("courses").select("id, slug, title, category, level, price, students, status").order("position");
  return NextResponse.json({ courses: data ?? [] });
}

export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const body = await req.json();
  if (!body.slug || !body.title) return NextResponse.json({ error: "Thiếu slug/title" }, { status: 400 });
  const { data, error } = await admin.from("courses").insert(pick(body)).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  const { error } = await admin.from("courses").update(pick(body)).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  const { error } = await admin.from("courses").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
