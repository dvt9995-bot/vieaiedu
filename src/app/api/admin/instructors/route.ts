import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { notify } from "@/lib/notify";

// Danh sách đơn đăng ký giảng viên (kèm thông tin hồ sơ)
export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { data } = await admin.from("instructor_applications").select("*").order("created_at", { ascending: false });
  const ids = [...new Set((data || []).map((a) => a.user_id))];
  const { data: profs } = ids.length ? await admin.from("profiles").select("id, email, full_name, avatar_url").in("id", ids) : { data: [] };
  const pmap = new Map((profs || []).map((p) => [p.id, p]));
  const applications = (data || []).map((a) => ({ ...a, profile: pmap.get(a.user_id) || null }));
  return NextResponse.json({ applications });
}

// Duyệt / từ chối đơn
export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { id, action, note } = await req.json();
  if (!id || !["approve", "reject"].includes(action)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { data: app } = await admin.from("instructor_applications").select("user_id").eq("id", id).maybeSingle();
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });
  const status = action === "approve" ? "approved" : "rejected";
  await admin.from("instructor_applications").update({ status, admin_note: note || null, reviewed_at: new Date().toISOString() }).eq("id", id);
  if (action === "approve") {
    await admin.from("profiles").update({ role: "instructor" }).eq("id", app.user_id);
    await notify({ userId: app.user_id, type: "system", title: "🎉 Bạn đã trở thành Giảng viên!", body: "Vào Khu giảng viên để tạo khóa học đầu tiên của bạn.", href: "/teach", push: true });
  } else {
    await notify({ userId: app.user_id, type: "system", title: "Đăng ký giảng viên chưa được duyệt", body: note || "Bạn có thể bổ sung hồ sơ và đăng ký lại.", href: "/teach" });
  }
  return NextResponse.json({ ok: true });
}
