import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";

export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { data } = await admin.from("coupons").select("*").order("created_at", { ascending: false });
  return NextResponse.json({ coupons: data ?? [] });
}

export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { code, percent_off, expires_at } = await req.json();
  if (!code || !percent_off) return NextResponse.json({ error: "Thiếu mã/giảm %" }, { status: 400 });
  const { error } = await admin.from("coupons").upsert({
    code: String(code).toUpperCase(), percent_off: Number(percent_off), active: true,
    expires_at: expires_at || null,
  }, { onConflict: "code" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const code = new URL(req.url).searchParams.get("code");
  await admin.from("coupons").delete().eq("code", code);
  return NextResponse.json({ ok: true });
}
