import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";

export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { data } = await admin.from("posts").select("id, body, image_url, hidden, created_at, author_id, profiles(full_name)").order("created_at", { ascending: false }).limit(200);
  const posts = (data ?? []).map((p) => ({
    id: p.id, body: p.body, image: p.image_url, hidden: p.hidden, created_at: p.created_at,
    author_id: p.author_id, author: (p as { profiles?: { full_name?: string } }).profiles?.full_name || "Học viên",
  }));
  return NextResponse.json({ posts });
}

export async function PATCH(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { id, hidden } = await req.json();
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  const { error } = await admin.from("posts").update({ hidden: !!hidden }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const id = new URL(req.url).searchParams.get("id");
  await admin.from("posts").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
