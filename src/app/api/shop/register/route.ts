import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/video";
import { notifyAdmins } from "@/lib/notify";

// Trạng thái shop của tôi
export async function GET() {
  const s = await createClient();
  if (!s) return NextResponse.json({ shop: null });
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const admin = createAdminClient()!;
  const { data } = await admin.from("shops").select("*").eq("owner_id", user.id).maybeSingle();
  return NextResponse.json({ shop: data || null });
}

// Đăng ký mở shop (chờ admin duyệt)
export async function POST(req: Request) {
  const s = await createClient();
  if (!s) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const admin = createAdminClient()!;
  const { data: existing } = await admin.from("shops").select("id, status").eq("owner_id", user.id).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, status: existing.status });
  const b = await req.json();
  if (!String(b.name || "").trim()) return NextResponse.json({ error: "Nhập tên shop" }, { status: 400 });
  let slug = slugify(b.name) || `shop-${Date.now()}`;
  const { data: dup } = await admin.from("shops").select("id").eq("slug", slug).maybeSingle();
  if (dup) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await admin.from("shops").insert({ owner_id: user.id, name: String(b.name).trim(), slug, description: b.description || null, logo_url: b.logo_url || null, status: "pending" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await notifyAdmins("🏪 Đăng ký mở shop mới", `"${b.name}" chờ duyệt.`, "/admin");
  return NextResponse.json({ ok: true, status: "pending" });
}
