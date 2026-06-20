import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// Đăng ký nhận tin (newsletter). Lưu vào bảng subscribers.
export async function POST(req: Request) {
  if (!rateLimit(`subscribe:${clientIp(req)}`, 5, 60_000))
    return NextResponse.json({ error: "Thử lại sau ít phút." }, { status: 429 });
  const { email } = await req.json().catch(() => ({ email: "" }));
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Email không hợp lệ" }, { status: 400 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const { error } = await admin.from("subscribers").upsert({ email }, { onConflict: "email" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
