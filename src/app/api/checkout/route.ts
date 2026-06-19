import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCourse } from "@/lib/mock";
import { orderCode, sepayQrUrl } from "@/lib/sepay";

// Tạo đơn hàng cho 1 khóa và trả về QR SePay để thanh toán.
export async function POST(req: Request) {
  const { slug } = await req.json().catch(() => ({ slug: "" }));
  const course = getCourse(slug);
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

  // Tạo order pending
  const { data: order, error } = await supabase
    .from("orders")
    .insert({ user_id: user.id, course_slug: slug, amount: course.price, status: "pending" })
    .select("id").single();
  if (error || !order) return NextResponse.json({ error: error?.message ?? "Lỗi tạo đơn" }, { status: 500 });

  const code = orderCode(order.id);
  await supabase.from("orders").update({ sepay_ref: code }).eq("id", order.id);

  return NextResponse.json({
    orderId: order.id,
    amount: course.price,
    code,
    qrUrl: sepayQrUrl(course.price, code),
  });
}
