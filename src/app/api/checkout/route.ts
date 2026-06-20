import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCourseBySlug } from "@/lib/courses";
import { orderCode, sepayQrUrl } from "@/lib/sepay";
import { validateCoupon } from "@/lib/coupon";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// Tạo đơn hàng cho 1 khóa và trả về QR SePay để thanh toán.
export async function POST(req: Request) {
  if (!rateLimit(`checkout:${clientIp(req)}`, 15, 60_000))
    return NextResponse.json({ error: "Thao tác quá nhanh, vui lòng thử lại sau." }, { status: 429 });
  const { slug, couponCode } = await req.json().catch(() => ({ slug: "" }));
  const course = await getCourseBySlug(slug);
  if (!course) return NextResponse.json({ error: "Không tìm thấy khóa học" }, { status: 404 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Chưa cấu hình Supabase" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });

  // Đã sở hữu?
  const { data: existing } = await supabase
    .from("enrollments").select("id").eq("user_id", user.id).eq("course_slug", slug).maybeSingle();
  if (existing) return NextResponse.json({ enrolled: true });

  if (course.price === 0) return NextResponse.json({ error: "Khóa miễn phí — dùng nút Học miễn phí" }, { status: 400 });

  // Áp mã giảm giá (validate server-side)
  const percentOff = couponCode ? await validateCoupon(couponCode) : 0;
  const amount = Math.round(course.price * (1 - percentOff / 100));

  // Tạo order pending
  const { data: order, error } = await supabase
    .from("orders")
    .insert({ user_id: user.id, course_slug: slug, amount, status: "pending" })
    .select("id").single();
  if (error || !order) return NextResponse.json({ error: error?.message ?? "Lỗi tạo đơn" }, { status: 500 });

  const code = orderCode(order.id);
  await supabase.from("orders").update({ sepay_ref: code }).eq("id", order.id);

  return NextResponse.json({
    orderId: order.id,
    amount,
    code,
    qrUrl: await sepayQrUrl(amount, code),
    percentOff,
  });
}
