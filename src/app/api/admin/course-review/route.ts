import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { notify } from "@/lib/notify";

// Khóa của giảng viên đang chờ duyệt
export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { data } = await admin.from("courses").select("id, slug, title, price, total_minutes, owner_id, review_status").eq("review_status", "pending").order("created_at", { ascending: false });
  const ids = [...new Set((data || []).map((c) => c.owner_id).filter(Boolean))];
  const { data: profs } = ids.length ? await admin.from("profiles").select("id, full_name, email").in("id", ids as string[]) : { data: [] };
  const pmap = new Map((profs || []).map((p) => [p.id, p]));
  const courses = (data || []).map((c) => ({ ...c, owner: c.owner_id ? pmap.get(c.owner_id) || null : null }));
  return NextResponse.json({ courses });
}

// Duyệt / trả về chỉnh sửa
export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { id, action, note } = await req.json();
  const { data: c } = await admin.from("courses").select("owner_id, title").eq("id", id).maybeSingle();
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (action === "approve") {
    await admin.from("courses").update({ review_status: "approved", status: "published", review_note: null }).eq("id", id);
    if (c.owner_id) await notify({ userId: c.owner_id, type: "system", title: "✅ Khóa học đã được duyệt", body: `"${c.title}" đã lên sàn và hiển thị công khai.`, href: "/teach", push: true });
  } else {
    await admin.from("courses").update({ review_status: "rejected", review_note: note || null }).eq("id", id);
    if (c.owner_id) await notify({ userId: c.owner_id, type: "system", title: "Khóa học cần chỉnh sửa", body: note || "Vui lòng xem góp ý và gửi duyệt lại.", href: "/teach" });
  }
  revalidateTag("courses", "max");
  return NextResponse.json({ ok: true });
}
