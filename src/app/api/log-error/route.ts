import { NextResponse } from "next/server";
import { notifyAdmins } from "@/lib/notify";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// Nhận lỗi giao diện từ client → cảnh báo admin (in-app). Chống lặp + spam.
const seen = new Map<string, number>();

export async function POST(req: Request) {
  if (!rateLimit(`logerr:${clientIp(req)}`, 10, 60_000)) return NextResponse.json({ ok: false }, { status: 429 });
  const { message, url } = await req.json().catch(() => ({}));
  if (!message) return NextResponse.json({ ok: false }, { status: 400 });
  const key = String(message).slice(0, 120);
  const now = Date.now();
  // Bỏ qua nếu lỗi giống nhau vừa báo trong 10 phút
  if (seen.get(key) && now - seen.get(key)! < 600_000) return NextResponse.json({ ok: true, deduped: true });
  seen.set(key, now);
  await notifyAdmins("🔴 Lỗi giao diện người dùng", `${String(message).slice(0, 200)}${url ? `\nTrang: ${url}` : ""}`, "/admin", { email: false });
  return NextResponse.json({ ok: true });
}
