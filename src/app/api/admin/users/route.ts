import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { walletChange } from "@/lib/wallet";
import { notify } from "@/lib/notify";

export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;

  // NGUỒN CHÍNH: bảng profiles (luôn đọc được qua data API) → học viên LUÔN hiển thị,
  // không phụ thuộc Auth Admin API (listUsers có thể lỗi mạng/khóa).
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, role, full_name, email, student_code, referral_count, credit_balance, real_balance, created_at")
    .order("created_at", { ascending: false });

  const { data: enr } = await admin.from("enrollments").select("user_id");
  const enrollCount = new Map<string, number>();
  for (const e of enr ?? []) enrollCount.set(e.user_id as string, (enrollCount.get(e.user_id as string) || 0) + 1);

  // BỔ SUNG (best-effort): trạng thái khóa + email dự phòng từ Auth Admin API. Lỗi → bỏ qua.
  const authMap = new Map<string, { email?: string; banned?: boolean }>();
  let authOk = false;
  try {
    const { data: list, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (!error && list?.users) {
      authOk = true;
      for (const u of list.users) authMap.set(u.id, { email: u.email, banned: !!(u as { banned_until?: string }).banned_until });
    }
  } catch { /* listUsers lỗi → vẫn có danh sách từ profiles */ }

  const users = (profiles ?? []).map((p) => {
    const a = authMap.get(p.id as string) || {};
    return {
      id: p.id, email: (p.email as string) || a.email || "",
      name: (p.full_name as string) || "",
      role: (p.role as string) || "student",
      studentCode: (p.student_code as string) || "",
      referrals: (p.referral_count as number) || 0,
      credit: (p.credit_balance as number) || 0,
      real: (p.real_balance as number) || 0,
      banned: !!a.banned,
      courses: enrollCount.get(p.id as string) || 0,
      created_at: p.created_at,
    };
  });
  return NextResponse.json({ users, authOk });
}

export async function PATCH(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { id, role, ban, studentCode, grantCredit, grantReal } = await req.json();
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  if (role) await admin.from("profiles").update({ role }).eq("id", id);
  if (studentCode !== undefined) await admin.from("profiles").update({ student_code: studentCode || null }).eq("id", id);
  if (ban !== undefined) await admin.auth.admin.updateUserById(id, { ban_duration: ban ? "876000h" : "none" });
  // Admin tặng/điều chỉnh số dư ví
  if (grantCredit) { await walletChange(id, "credit", Number(grantCredit), "Admin tặng số dư khuyến mãi"); await notify({ userId: id, type: "promo", title: `🎁 Bạn được tặng ${Number(grantCredit).toLocaleString("vi-VN")}đ`, body: "Số dư khuyến mãi vừa được cộng vào ví của bạn.", href: "/account" }); }
  if (grantReal) { await walletChange(id, "real", Number(grantReal), "Admin điều chỉnh số dư"); }
  return NextResponse.json({ ok: true });
}
