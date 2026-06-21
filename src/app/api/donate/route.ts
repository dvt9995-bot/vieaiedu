import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/server";
import { sepayQrUrl, isSepayConfigured } from "@/lib/sepay";
import { rateLimit, clientIp } from "@/lib/ratelimit";

const MIN = 10000; // tối thiểu 10.000đ (giới hạn QR)

function donateCode(id: string) {
  return "UHO" + id.replace(/-/g, "").slice(0, 12).toUpperCase();
}

// Tạo yêu cầu ủng hộ (tùy tâm) → QR SePay. Webhook xác nhận sẽ đánh dấu đã trả.
export async function POST(req: Request) {
  if (!rateLimit(`donate:${clientIp(req)}`, 10, 60_000)) return NextResponse.json({ error: "Thử lại sau." }, { status: 429 });
  if (!(await isSepayConfigured())) return NextResponse.json({ error: "Chưa cấu hình thanh toán" }, { status: 503 });

  const { amount, message, courseSlug } = await req.json().catch(() => ({}));
  const amt = Math.round(Number(amount) || 0);
  if (amt < MIN) return NextResponse.json({ error: `Số tiền ủng hộ tối thiểu ${MIN.toLocaleString("vi-VN")}đ` }, { status: 400 });

  const user = await getCurrentUser();
  const admin = createAdminClient()!;
  const { data: don, error } = await admin.from("donations")
    .insert({ user_id: user?.id ?? null, amount: amt, message: (message || "").slice(0, 280) || null, course_slug: courseSlug || null, status: "pending" })
    .select("id").single();
  if (error || !don) return NextResponse.json({ error: "Không tạo được yêu cầu" }, { status: 500 });

  const code = donateCode(don.id as string);
  await admin.from("donations").update({ sepay_ref: code }).eq("id", don.id);
  const qrUrl = await sepayQrUrl(amt, code);
  return NextResponse.json({ ok: true, id: don.id, code, amount: amt, qrUrl });
}
