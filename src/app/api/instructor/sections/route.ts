import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInstructor, ownsCourse } from "@/lib/instructor-guard";

async function courseOfSection(admin: NonNullable<ReturnType<typeof createAdminClient>>, sectionId: string) {
  const { data } = await admin.from("sections").select("course_id").eq("id", sectionId).maybeSingle();
  return data?.course_id as string | undefined;
}

export async function POST(req: Request) {
  const u = await requireInstructor();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { course_id, title, position } = await req.json();
  if (!course_id || !title) return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 });
  if (!(await ownsCourse(course_id, u))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { data, error } = await admin.from("sections").insert({ course_id, title, position: position ?? 0 }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function DELETE(req: Request) {
  const u = await requireInstructor();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  const courseId = await courseOfSection(admin, id);
  if (!courseId || !(await ownsCourse(courseId, u))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { error } = await admin.from("sections").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateTag("courses", "max");
  return NextResponse.json({ ok: true });
}
