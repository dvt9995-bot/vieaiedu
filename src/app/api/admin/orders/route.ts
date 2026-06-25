import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { notify } from "@/lib/notify";
import { fulfillCourseOrder } from "@/lib/fulfill";

// Danh sách đơn hàng (admin)
export async function GET(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const status = new URL(req.url).searchParams.get("status");
  let q = admin.from("orders")
    .select("id, user_id, course_slug, amount, wallet_used, coupon_code, status, sepay_ref, paid_at, created_at, source, profiles(full_name, student_code, phone, email)")
    .order("created_at", { ascending: false }).limit(200);
  if (status && status !== "all") q = q.eq("status", status);
  const { data } = await q;
  const items = (data || []).map((o) => {
    const p = (o as { profiles?: { full_name?: string; student_code?: string; phone?: string; email?: string } }).profiles;
    return {
      id: o.id, course_slug: o.course_slug, amount: o.amount, wallet_used: o.wallet_used,
      coupon_code: o.coupon_code, status: o.status, sepay_ref: o.sepay_ref, paid_at: o.paid_at, created_at: o.created_at,
      user_id: o.user_id, source: (o as { source?: string }).source || null,
      name: p?.full_name || "Học viên", student_code: p?.student_code || "—",
      phone: p?.phone || null, email: p?.email || null,
    };
  });
  return NextResponse.json({ items });
}

// PATCH {id, action} — "enroll": ghi danh thủ công (xử lý đơn đã thu tiền nhưng ghi danh lỗi);
// "mark_paid": đánh dấu đã thanh toán + ghi danh (xác nhận chuyển khoản thủ công)
export async function PATCH(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { id, action } = await req.json().catch(() => ({}));
  if (!id || !["enroll", "mark_paid"].includes(action)) return NextResponse.json({ error: "Tham số sai" }, { status: 400 });

  const { data: o } = await admin.from("orders").select("user_id, course_slug, status").eq("id", id).maybeSingle();
  if (!o) return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });

  if (action === "mark_paid") {
    // Xác nhận tay = chạy Y HỆT webhook tự động: ghi danh + hoa hồng + thông báo "Thanh toán thành công" + email biên lai.
    if (o.status === "paid") return NextResponse.json({ error: "Đơn đã ở trạng thái đã thanh toán" }, { status: 409 });
    const r = await fulfillCourseOrder(admin, id as string, "admin");
    if (!r.ok) return NextResponse.json({ error: "Không xử lý được đơn" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  // action === "enroll": chỉ ghi danh lại (đơn đã thu tiền nhưng học viên chưa vào được khóa)
  await admin.from("enrollments").upsert({ user_id: o.user_id, course_slug: o.course_slug }, { onConflict: "user_id,course_slug" });
  await notify({ userId: o.user_id as string, type: "transactional", title: "Đã kích hoạt khóa học 🎉", body: `Quản trị viên đã ghi danh khóa cho bạn. Vào học ngay!`, href: `/learn/${o.course_slug}`, email: false });
  return NextResponse.json({ ok: true });
}
