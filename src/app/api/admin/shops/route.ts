import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { notify } from "@/lib/notify";

export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { data } = await admin.from("shops").select("*").order("created_at", { ascending: false });
  const ids = [...new Set((data || []).map((s) => s.owner_id))];
  const { data: profs } = ids.length ? await admin.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
  const pm = new Map((profs || []).map((p) => [p.id, p]));
  return NextResponse.json({ shops: (data || []).map((s) => ({ ...s, owner: pm.get(s.owner_id) || null })) });
}

export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { id, action, note } = await req.json();
  const { data: shop } = await admin.from("shops").select("owner_id, name").eq("id", id).maybeSingle();
  if (!shop) return NextResponse.json({ error: "not found" }, { status: 404 });
  const status = action === "approve" ? "approved" : action === "suspend" ? "suspended" : "pending";
  await admin.from("shops").update({ status, admin_note: note || null, reviewed_at: new Date().toISOString() }).eq("id", id);
  if (action === "approve") await notify({ userId: shop.owner_id, type: "system", title: "🏪 Shop của bạn đã được duyệt!", body: `"${shop.name}" có thể đăng bán ngay. Vào Kênh người bán để bắt đầu.`, href: "/seller", push: true });
  else if (action === "suspend") await notify({ userId: shop.owner_id, type: "system", title: "Shop bị tạm khóa", body: note || "Liên hệ quản trị để biết thêm.", href: "/seller" });
  return NextResponse.json({ ok: true });
}
