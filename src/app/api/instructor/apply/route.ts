import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentUser } from "@/lib/instructor-guard";

// Trạng thái đơn của tôi
export async function GET() {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient()!;
  const { data } = await admin.from("instructor_applications").select("*").eq("user_id", u.uid).maybeSingle();
  return NextResponse.json({ application: data || null, role: u.role });
}

// Nộp / nộp lại đơn đăng ký làm giảng viên
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (u.role === "instructor" || u.role === "admin") return NextResponse.json({ ok: true, role: u.role });
  const b = await req.json();
  if (!b.agree_terms) return NextResponse.json({ error: "Cần đồng ý điều khoản & cam kết bản quyền" }, { status: 400 });
  if (!String(b.full_name || "").trim() || !String(b.expertise || "").trim()) return NextResponse.json({ error: "Vui lòng nhập họ tên và lĩnh vực chuyên môn" }, { status: 400 });
  const admin = createAdminClient()!;
  const row = {
    user_id: u.uid,
    full_name: String(b.full_name).trim(),
    expertise: String(b.expertise).trim(),
    bio: b.bio || null,
    sample_links: b.sample_links || null,
    motivation: b.motivation || null,
    agree_terms: true,
    status: "pending",
    admin_note: null,
    reviewed_at: null,
  };
  const { error } = await admin.from("instructor_applications").upsert(row, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
