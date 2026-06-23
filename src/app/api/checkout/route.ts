import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPurchasableCourse } from "@/lib/courses";
import { firstSessionLabel } from "@/lib/live";
import { orderCode, sepayQrUrl } from "@/lib/sepay";
import { validateCoupon, consumeCoupon } from "@/lib/coupon";
import { ALL_ACCESS, getBundle, enrollAllPublished } from "@/lib/bundle";
import { getBalances, walletChange } from "@/lib/wallet";
import { notify, notifyAdmins } from "@/lib/notify";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// Tạo đơn hàng cho 1 khóa: áp mã + dùng số dư ví, trả QR SePay cho phần còn lại.
export async function POST(req: Request) {
  if (!rateLimit(`checkout:${clientIp(req)}`, 15, 60_000))
    return NextResponse.json({ error: "Thao tác quá nhanh, vui lòng thử lại sau." }, { status: 429 });
  const { slug, couponCode, useWallet } = await req.json().catch(() => ({ slug: "" }));

  // Gói ALL-ACCESS (trọn bộ) — khác với mua 1 khóa
  const isBundle = slug === ALL_ACCESS;
  const bundle = isBundle ? await getBundle() : null;
  const course = isBundle ? null : await getPurchasableCourse(slug);
  if (isBundle ? !bundle : !course) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  const basePrice = isBundle ? bundle!.price : course!.price;
  const itemTitle = isBundle ? bundle!.title : course!.title;

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Chưa cấu hình Supabase" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const admin = createAdminClient()!;

  if (!isBundle) {
    const { data: existing } = await supabase.from("enrollments").select("id").eq("user_id", user.id).eq("course_slug", slug).maybeSingle();
    if (existing) return NextResponse.json({ enrolled: true });
    if (course!.price === 0) return NextResponse.json({ error: "Khóa miễn phí — dùng nút Học miễn phí" }, { status: 400 });
  }

  const percentOff = couponCode ? await validateCoupon(couponCode) : 0;
  const amount = Math.round(basePrice * (1 - percentOff / 100));

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

  // Lưu mã giảm giá vào đơn (best-effort — bỏ qua nếu chưa chạy migration coupon-limits)
  if (percentOff > 0) await supabase.from("orders").update({ coupon_code: String(couponCode).toUpperCase() }).eq("id", order.id);

  // Trừ ví — KIỂM TRA kết quả; nếu thất bại/không đủ (đua 2 tab) thì HỦY đơn + hoàn phần đã trừ
  if (usedCredit > 0) {
    const ok = await walletChange(user.id, "credit", -usedCredit, `Mua ${itemTitle}`, order.id);
    if (!ok) {
      await admin.from("orders").delete().eq("id", order.id);
      return NextResponse.json({ error: "Số dư ví không đủ, vui lòng thử lại." }, { status: 409 });
    }
  }
  if (usedReal > 0) {
    const ok = await walletChange(user.id, "real", -usedReal, `Mua ${itemTitle}`, order.id);
    if (!ok) {
      if (usedCredit > 0) await walletChange(user.id, "credit", usedCredit, `Hoàn ví (hủy đơn lỗi) ${itemTitle}`, order.id);
      await admin.from("orders").delete().eq("id", order.id);
      return NextResponse.json({ error: "Số dư ví không đủ, vui lòng thử lại." }, { status: 409 });
    }
  }

  if (fullyPaid) {
    if (percentOff > 0) await consumeCoupon(couponCode); // tiêu 1 lượt dùng mã
    if (isBundle) {
      await enrollAllPublished(admin, user.id);
    } else {
      const { error: enrollErr } = await admin.from("enrollments").upsert({ user_id: user.id, course_slug: slug }, { onConflict: "user_id,course_slug" });
      if (enrollErr) await notifyAdmins("🔴 Đã trừ ví nhưng ghi danh LỖI", `Đơn ${order.id} (${itemTitle}). Cần ghi danh thủ công.`, "/admin", { email: true });
    }
    const sched = !isBundle && course!.format === "live" ? await firstSessionLabel(slug) : "";
    await notify({ userId: user.id, type: "transactional", title: "Thanh toán thành công 🎉", body: `Bạn đã sở hữu "${itemTitle}".${sched ? ` Buổi học đầu: ${sched}. Hệ thống sẽ nhắc bạn trước giờ học.` : " Vào học ngay!"}`, href: isBundle ? "/courses" : course!.format === "live" ? `/live/${slug}` : `/learn/${slug}`, email: false });
    return NextResponse.json({ enrolled: true, bundle: isBundle });
  }

  const code = orderCode(order.id);
  await supabase.from("orders").update({ sepay_ref: code }).eq("id", order.id);
  return NextResponse.json({ orderId: order.id, amount: payable, code, qrUrl: await sepayQrUrl(payable, code), percentOff, walletUsed: used });
}
