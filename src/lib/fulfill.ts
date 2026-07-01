import { createAdminClient } from "@/lib/supabase/admin";
import { getPurchasableCourse } from "@/lib/courses";
import { firstSessionLabel } from "@/lib/live";
import { sendOrderReceipt, sendCourseWelcome, sendGenericEmail } from "@/lib/email";
import { notify, notifyAdmins } from "@/lib/notify";
import { getConfig } from "@/lib/settings";
import { formatVND } from "@/lib/format";
import { walletChange } from "@/lib/wallet";
import { consumeCoupon } from "@/lib/coupon";
import { ALL_ACCESS, enrollAllPublished } from "@/lib/bundle";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

const RELEASE_MS = 3 * 86400000; // giữ tiền sàn 3 ngày

// Hoàn tất 1 đơn KHÓA HỌC khi đã nhận tiền (webhook SePay HOẶC admin xác nhận tay).
// Cổng atomic (chưa-paid → paid) đảm bảo side-effect chỉ chạy đúng 1 lần dù gọi lại.
// source: "webhook" | "admin" — chỉ để log.
export async function fulfillCourseOrder(admin: Admin, orderId: string, source: "webhook" | "admin" = "webhook") {
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return { ok: false as const, error: "not_found" };

  const { data: paidRows } = await admin.from("orders")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", orderId).neq("status", "paid").select("id");
  if (!paidRows || paidRows.length === 0) return { ok: true as const, alreadyPaid: true };

  await consumeCoupon(order.coupon_code as string | undefined);
  const isBundle = order.course_slug === ALL_ACCESS;
  let enrollErr: { message: string } | null = null;
  if (isBundle) await enrollAllPublished(admin, order.user_id);
  else ({ error: enrollErr } = await admin.from("enrollments").upsert({ user_id: order.user_id, course_slug: order.course_slug }, { onConflict: "user_id,course_slug" }));

  const course = isBundle ? null : await getPurchasableCourse(order.course_slug);
  const courseTitle = isBundle ? "Trọn bộ khóa học (All-access)" : (course?.title ?? order.course_slug);
  const courseHref = isBundle ? "/courses" : course?.format === "live" ? `/live/${order.course_slug}` : `/learn/${order.course_slug}`;

  // Hoa hồng giới thiệu
  try {
    const { data: buyer } = await admin.from("profiles").select("referred_by, full_name").eq("id", order.user_id).maybeSingle();
    const refId = buyer?.referred_by as string | undefined;
    if (refId && order.amount > 0) {
      const pct = parseInt(await getConfig("referral_commission_pct")) || 0;
      if (pct > 0) {
        const commission = Math.round((order.amount as number) * pct / 100);
        if (commission > 0) {
          await walletChange(refId, "real", commission, `Hoa hồng giới thiệu (${pct}%) từ đơn của ${buyer?.full_name || "học viên"}`, order.id);
          await notify({ userId: refId, type: "transactional", title: `💸 Bạn nhận ${commission.toLocaleString("vi-VN")}đ hoa hồng`, body: `Người bạn giới thiệu vừa mua khóa học. Hoa hồng đã cộng vào ví của bạn.`, href: "/account" });
        }
      }
    }
  } catch {}

  await notifyAdmins("💰 Đơn hàng mới", `${courseTitle} · ${formatVND(order.amount)}${source === "admin" ? " (xác nhận tay)" : ""}`, "/admin");
  if (enrollErr) await notifyAdmins("🔴 Đã thu tiền nhưng ghi danh LỖI", `Đơn ${order.id} (${courseTitle}). Cần ghi danh thủ công cho học viên.`, "/admin", { email: true });

  await notify({
    userId: order.user_id, type: "transactional",
    title: "Thanh toán thành công 🎉",
    body: `Bạn đã sở hữu "${courseTitle}".${course?.format === "live" ? await (async () => { const s = await firstSessionLabel(order.course_slug); return s ? ` Buổi học đầu: ${s}. Hệ thống sẽ nhắc bạn trước giờ học.` : " Xem lịch học ngay!"; })() : " Vào học ngay!"}`,
    href: courseHref, email: false,
  });

  // Email cho người mua
  try {
    const { data: u } = await admin.auth.admin.getUserById(order.user_id);
    const email = u.user?.email;
    if (email) {
      if (order.source === "landing") {
        // Mua qua landing → tài khoản tạo tự động: gửi email chào mừng + link đăng nhập 1-chạm + hướng dẫn vào học
        const site = process.env.NEXT_PUBLIC_SITE_URL || "https://vieaiedu.vn";
        let loginLink = `${site}/login`;
        try {
          const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo: `${site}/auth/callback?next=/dashboard` } });
          if (link?.properties?.action_link) loginLink = link.properties.action_link;
        } catch {}
        const isLive = course?.format === "live";
        const firstSession = isLive ? (await firstSessionLabel(order.course_slug)) || undefined : undefined;
        const { data: prof } = await admin.from("profiles").select("full_name").eq("id", order.user_id).maybeSingle();
        await sendCourseWelcome(email, { name: prof?.full_name as string, courseTitle, amount: order.amount, loginLink, isLive, firstSession });
      } else if (course) {
        await sendOrderReceipt(email, course.title, order.amount);
      }
    }
  } catch {}

  return { ok: true as const, fulfilled: true, courseTitle };
}

// Hoàn tất 1 đơn SÀN khi đã nhận tiền: giữ escrow + ghi sổ + trừ kho + báo người mua/người bán.
// Cổng atomic (chưa-paid → paid+held) đảm bảo chạy 1 lần.
export async function fulfillShopOrder(admin: Admin, orderId: string) {
  const { data: o } = await admin.from("shop_orders").select("*").eq("id", orderId).maybeSingle();
  if (!o) return { ok: false as const, error: "not_found" };

  const releaseAt = new Date(Date.now() + RELEASE_MS).toISOString();
  const { data: paid } = await admin.from("shop_orders")
    .update({ status: "paid", escrow_status: "held", paid_at: new Date().toISOString(), release_at: releaseAt })
    .eq("id", orderId).eq("status", "pending").select("id");
  if (!paid || !paid.length) return { ok: true as const, alreadyPaid: true };

  await admin.from("escrow_ledger").insert([
    { order_id: o.id, shop_id: o.shop_id, type: "hold", amount: o.total, note: "Tạm giữ khi thanh toán" },
    { order_id: o.id, shop_id: o.shop_id, type: "fee", amount: o.fee_amount, note: "Phí sàn" },
  ]);

  const { data: items } = await admin.from("shop_order_items").select("product_id, qty, title").eq("order_id", o.id);
  const lowStock: string[] = [];
  for (const it of items || []) {
    if (!it.product_id) continue;
    const { data: p } = await admin.from("shop_products").select("stock, sold_count").eq("id", it.product_id).maybeSingle();
    if (p) {
      const patch: Record<string, unknown> = { sold_count: ((p.sold_count as number) || 0) + (it.qty as number) };
      if (p.stock != null) { const ns = Math.max(0, (p.stock as number) - (it.qty as number)); patch.stock = ns; if ((p.stock as number) > 3 && ns <= 3) lowStock.push(`${it.title} (còn ${ns})`); }
      await admin.from("shop_products").update(patch).eq("id", it.product_id);
    }
  }

  const { data: shop } = await admin.from("shops").select("owner_id, name").eq("id", o.shop_id).maybeSingle();
  if (o.buyer_id) await notify({ userId: o.buyer_id as string, type: "transactional", title: "Thanh toán thành công 🎉", body: o.has_physical ? "Đơn đã thanh toán — người bán sẽ giao sớm, theo dõi ở Đơn của tôi." : "Đơn đã thanh toán — vào Đơn của tôi để nhận sản phẩm số.", href: "/shop/orders" });
  if (shop?.owner_id) {
    await notify({ userId: shop.owner_id as string, type: "transactional", title: "🛒 Bạn có đơn hàng mới", body: `Đơn ${formatVND(o.total as number)} — vào Kênh người bán xử lý.`, href: "/seller" });
    if (lowStock.length) await notify({ userId: shop.owner_id as string, type: "system", title: "⚠️ Sản phẩm sắp hết hàng", body: lowStock.join(", ") + ". Nhớ nhập thêm hàng!", href: "/seller" });
    // Email cho người bán (nếu có cấu hình Resend + email)
    try {
      const { data: prof } = await admin.from("profiles").select("email").eq("id", shop.owner_id).maybeSingle();
      const itemList = (items || []).map((it) => `${it.title} ×${it.qty}`).join(", ");
      if (prof?.email) await sendGenericEmail(prof.email as string, `🛒 Đơn hàng mới ${formatVND(o.total as number)}`, "Bạn có đơn hàng mới trên sàn", `Đơn: <b>${itemList}</b><br/>Tổng: <b>${formatVND(o.total as number)}</b>${o.has_physical ? " (có sản phẩm vật lý — cần giao hàng)" : ""}.<br/>Vào Kênh người bán để xử lý.`, "/seller");
    } catch {}
  }
  return { ok: true as const, fulfilled: true, total: o.total as number };
}

// Hoàn tất CẢ nhóm đơn sàn chung 1 mã (đơn nhiều shop). Trả số đơn đã xử lý.
export async function fulfillShopGroupByCode(admin: Admin, code: string) {
  const { data: group } = await admin.from("shop_orders").select("id").eq("code", code);
  let done = 0;
  for (const g of group || []) { const r = await fulfillShopOrder(admin, g.id as string); if (r.ok && "fulfilled" in r && r.fulfilled) done++; }
  return done;
}
