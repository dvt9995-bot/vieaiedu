import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInstructor } from "@/lib/instructor-guard";

// Upload ảnh bìa (giảng viên) → bucket public, trả URL.
export async function POST(req: Request) {
  if (!(await requireInstructor())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const bucket = (form.get("bucket") as string) || "blog";
  if (!file) return NextResponse.json({ error: "Thiếu file" }, { status: 400 });
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage.from(bucket).upload(path, buf, { contentType: file.type || "image/jpeg", upsert: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const url = admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ ok: true, url });
}
