import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { walletChange } from "@/lib/wallet";
import { notify } from "@/lib/notify";

export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { data } = await admin.from("withdrawals").select("id, amount, bank_name, bank_account, bank_holder, status, created_at, user_id, profiles(full_name)").order("created_at", { ascending: false }).limit(200);
  const items = (data || []).map((w) => ({
    id: w.id, amount: w.amount, bank_name: w.bank_name, bank_account: w.bank_account, bank_holder: w.bank_holder,
    status: w.status, created_at: w.created_at, user_id: w.user_id,
    name: (w as { profiles?: { full_name?: string } }).profiles?.full_name || "Học viên",
  }));
  return NextResponse.json({ items });
}

export async function PATCH(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { id, action } = await req.json();
  if (!id || !["approve", "reject"].includes(action)) return NextResponse.json({ error: "Tham số sai" }, { status: 400 });
  const { data: w } = await admin.from("withdrawals").select("*").eq("id", id).maybeSingle();
  if (!w || w.status !== "pending") return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });

  if (action === "reject") {
    // Cổng atomic: chỉ hoàn tiền khi chuyển được pending → rejected (chống hoàn 2 lần do double-click / 2 admin)
    const { data: rows } = await admin.from("withdrawals").update({ status: "rejected", processed_at: new Date().toISOString() }).eq("id", id).eq("status", "pending").select("id");
    if (!rows || rows.length === 0) return NextResponse.json({ error: "Yêu cầu đã được xử lý" }, { status: 409 });
    await walletChange(w.user_id as string, "real", w.amount as number, "Hoàn tiền yêu cầu rút bị từ chối", id);
    await notify({ userId: w.user_id as string, type: "transactional", title: "Yêu cầu rút tiền bị từ chối", body: `Số tiền ${(w.amount as number).toLocaleString("vi-VN")}đ đã được hoàn lại vào ví hoa hồng.`, href: "/account" });
  } else {
    const { data: rows } = await admin.from("withdrawals").update({ status: "approved", processed_at: new Date().toISOString() }).eq("id", id).eq("status", "pending").select("id");
    if (!rows || rows.length === 0) return NextResponse.json({ error: "Yêu cầu đã được xử lý" }, { status: 409 });
    await notify({ userId: w.user_id as string, type: "transactional", title: "Yêu cầu rút tiền đã được duyệt ✅", body: `${(w.amount as number).toLocaleString("vi-VN")}đ sẽ được chuyển tới tài khoản của bạn.`, href: "/account" });
  }
  return NextResponse.json({ ok: true });
}
