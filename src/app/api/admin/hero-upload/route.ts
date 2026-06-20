import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";

// Tạo signed upload URL cho bucket hero (service-role) → client upload thẳng,
// tránh giới hạn body của serverless và vấn đề cache policy của Storage.
export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { ext } = await req.json().catch(() => ({}));
  const safeExt = String(ext || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
  const path = `hero-${Date.now()}.${safeExt}`;
  const { data, error } = await admin.storage.from("hero").createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const publicUrl = admin.storage.from("hero").getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ ok: true, path: data.path, token: data.token, publicUrl });
}
