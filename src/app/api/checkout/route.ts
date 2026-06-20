import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCourseBySlug } from "@/lib/courses";
import { orderCode, sepayQrUrl } from "@/lib/sepay";
import { validateCoupon } from "@/lib/coupon";
import { getBalances, walletChange } from "@/lib/wallet";
import { notify } from "@/lib/notify";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// Tạo đơn hàng cho 1 khóa: áp mã + dùng số dư ví, trả QR SePay cho phần còn lại.
export async function POST(req: Request) {
  if (!rateLimit(`checkout:${clientIp(req)}`, 15, 60_000))
    return NextResponse.json({ error: "Thao tác quá nhanh, vui lòng thử lại sau." }, { status: 429 });
  const { slug, couponCode, useWallet } = await req.json().catch(() => ({ slug: "" }));
  const course = await getCourseBySlug(slug);
  if (!course) return NextResponse.json({ error: "Không tìm thấy khóa học" }, { status: 404 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Chưa cấu hình Supabase" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const admin = createAdminClient()!;

  const { data: existing } = await supabase.from("enrollments").select("id").eq("user_id", user.id).eq("course_slug", slug).maybeSingle();
  if (existing) return NextResponse.json({ enrolled: true });
  if (course.price === 0) return NextResponse.json({ error: "Khóa miễn phí — dùng nút Học miễn phí" }, { status: 400 });

  const percentOff = couponCode ? await validateCoupon(couponCode) : 0;
  const amount = Math.round(course.price * (1 - percentOff / 100));

  // Dùng số dư ví (ưu tiên khuyến mãi trước, rồi hoa hồng)
  let used = 0, usedCredit = 0, usedReal = 0;
  if (useWallet) {
    const bal = await getBalances(user.id);
    used = Math.min(bal.credit + bal.real, amount);
    usedCredit = Math.min(bal.credit, used);
    usedReal = used - usedCredit;
  }
  const payable = amount - used;
  const fullyPaid = payable <= 0;

  const { data: order, error } = await supabase
    .from("orders")
    .insert({ user_id: user.id, course_slug: slug, amount: payable, wallet_used: used, status: fullyPaid ? "paid" : "pending", paid_at: fullyPaid ? new Date().toISOString() : null })
    .select("id").single();
  if (error || !order) return NextResponse.json({ error: error?.message ?? "Lỗi tạo đơn" }, { status: 500 });

  if (usedCredit > 0) await walletChange(user.id, "credit", -usedCredit, `Mua khóa ${course.title}`, order.id);
  if (usedReal > 0) await walletChange(user.id, "real", -usedReal, `Mua khóa ${course.title}`, order.id);

  if (fullyPaid) {
    await admin.from("enrollments").upsert({ user_id: user.id, course_slug: slug }, { onConflict: "user_id,course_slug" });
    await notify({ userId: user.id, type: "transactional", title: "Thanh toán thành công 🎉", body: `Bạn đã sở hữu khóa "${course.title}" (thanh toán bằng số dư ví).`, href: `/learn/${slug}`, email: false });
    return NextResponse.json({ enrolled: true });
  }

  const code = orderCode(order.id);
  await supabase.from("orders").update({ sepay_ref: code }).eq("id", order.id);
  return NextResponse.json({ orderId: order.id, amount: payable, code, qrUrl: await sepayQrUrl(payable, code), percentOff, walletUsed: used });
}
