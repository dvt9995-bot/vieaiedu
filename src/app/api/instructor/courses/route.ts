import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInstructor, ownsCourse } from "@/lib/instructor-guard";
import { slugify } from "@/lib/video";

const FIELDS = ["title", "subtitle", "description", "category", "level", "price", "compare_price", "thumb", "instructor"];
function pick(b: Record<string, unknown>) {
  const o: Record<string, unknown> = {};
  for (const f of FIELDS) if (b[f] !== undefined) o[f] = b[f];
  if (typeof o.price === "string") o.price = parseInt(o.price as string) || 0;
  if (typeof o.compare_price === "string") o.compare_price = parseInt(o.compare_price as string) || null;
  return o;
}

// Danh sách khóa của tôi
export async function GET() {
  const u = await requireInstructor();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { data } = await admin.from("courses").select("id, slug, title, subtitle, description, price, compare_price, status, review_status, review_note, total_minutes, thumb, category, level, instructor").eq("owner_id", u.uid).order("created_at", { ascending: false });
  return NextResponse.json({ courses: data ?? [] });
}

// Tạo khóa mới (mặc định nháp + chờ duyệt)
export async function POST(req: Request) {
  const u = await requireInstructor();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const b = await req.json();
  if (!String(b.title || "").trim()) return NextResponse.json({ error: "Thiếu tiêu đề khóa học" }, { status: 400 });
  let slug = slugify(b.title) || `khoa-${Date.now()}`;
  const { data: ex } = await admin.from("courses").select("id").eq("slug", slug).maybeSingle();
  if (ex) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  const insert = { ...pick(b), slug, owner_id: u.uid, status: "draft", review_status: "draft" };
  const { data, error } = await admin.from("courses").insert(insert).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id, slug });
}

// Cập nhật / gửi duyệt
export async function PATCH(req: Request) {
  const u = await requireInstructor();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const b = await req.json();
  if (!b.id || !(await ownsCourse(b.id, u))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (b.action === "submit") {
    const { count } = await admin.from("lessons").select("id", { count: "exact", head: true }).eq("course_id", b.id);
    if (!count) return NextResponse.json({ error: "Khóa cần ít nhất 1 bài học trước khi gửi duyệt" }, { status: 400 });
    // Khóa thu phí bắt buộc video Bunny (không dùng link YouTube công khai)
    const { data: paid } = await admin.from("courses").select("price").eq("id", b.id).maybeSingle();
    if ((paid?.price || 0) > 0) {
      const { data: ls } = await admin.from("lessons").select("video_id").eq("course_id", b.id);
      const ytPaid = (ls || []).some((l) => typeof l.video_id === "string" && l.video_id.startsWith("yt:"));
      if (ytPaid) return NextResponse.json({ error: "Khóa thu phí phải dùng video tải lên (Bunny), không dùng link YouTube" }, { status: 400 });
    }
    await admin.from("courses").update({ review_status: "pending" }).eq("id", b.id);
    return NextResponse.json({ ok: true });
  }
  await admin.from("courses").update(pick(b)).eq("id", b.id);
  revalidateTag("courses", "max");
  return NextResponse.json({ ok: true });
}

// Xóa khóa của tôi
export async function DELETE(req: Request) {
  const u = await requireInstructor();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !(await ownsCourse(id, u))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await admin.from("courses").delete().eq("id", id);
  revalidateTag("courses", "max");
  return NextResponse.json({ ok: true });
}
