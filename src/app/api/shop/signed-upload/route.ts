import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Signed URL để tải FILE SẢN PHẨM SỐ thẳng lên Supabase (tránh giới hạn 4.5MB serverless).
export async function POST(req: Request) {
  const s = await createClient();
  if (!s) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const admin = createAdminClient()!;
  const { ext } = await req.json().catch(() => ({}));
  const safeExt = String(ext || "zip").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6) || "zip";
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${safeExt}`;
  const { data, error } = await admin.storage.from("shopfiles").createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // bucket "shopfiles" RIÊNG TƯ → lưu path (kèm tiền tố "file:") để tải qua link ký
  return NextResponse.json({ ok: true, bucket: "shopfiles", path: data.path, token: data.token, value: `file:${data.path}` });
}
