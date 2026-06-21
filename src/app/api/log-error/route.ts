import { NextResponse } from "next/server";
import { notifyAdmins } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// Nhận lỗi giao diện từ client → lưu nhật ký + cảnh báo admin (chống lặp & dồn).
const seen = new Map<string, number>();
let lastNotifyAt = 0; // throttle toàn cục: tránh dồn nhiều lỗi khác nhau

export async function POST(req: Request) {
  if (!rateLimit(`logerr:${clientIp(req)}`, 10, 60_000)) return NextResponse.json({ ok: false }, { status: 429 });
  const { message, url } = await req.json().catch(() => ({}));
  if (!message) return NextResponse.json({ ok: false }, { status: 400 });

  // Luôn ghi nhật ký lỗi (để admin xem tần suất)
  const admin = createAdminClient();
  if (admin) await admin.from("error_logs").insert({ message: String(message).slice(0, 500), url: url ? String(url).slice(0, 300) : null });

  const key = String(message).slice(0, 120);
  const now = Date.now();
  // Bỏ qua cảnh báo nếu lỗi GIỐNG NHAU vừa báo trong 10 phút
  if (seen.get(key) && now - seen.get(key)! < 600_000) return NextResponse.json({ ok: true, logged: true, deduped: true });
  // Throttle toàn cục: tối đa 1 cảnh báo / 3 phút (gộp burst lỗi khác nhau)
  if (now - lastNotifyAt < 180_000) { seen.set(key, now); return NextResponse.json({ ok: true, logged: true, throttled: true }); }
  seen.set(key, now);
  lastNotifyAt = now;
  await notifyAdmins("🔴 Lỗi giao diện người dùng", `${String(message).slice(0, 200)}${url ? `\nTrang: ${url}` : ""}`, "/admin", { email: false });
  return NextResponse.json({ ok: true, logged: true, notified: true });
}
