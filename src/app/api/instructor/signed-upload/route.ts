import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInstructor } from "@/lib/instructor-guard";

// Signed upload URL (bucket hero, công khai, tới ~50MB) → client tải video THẲNG lên Supabase,
// tránh giới hạn 4.5MB của serverless. Dùng cho video kết quả học viên.
export async function POST(req: Request) {
  if (!(await requireInstructor())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { ext } = await req.json().catch(() => ({}));
  const safeExt = String(ext || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "mp4";
  const path = `result-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${safeExt}`;
  const { data, error } = await admin.storage.from("hero").createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const publicUrl = admin.storage.from("hero").getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ ok: true, path: data.path, token: data.token, publicUrl });
}
