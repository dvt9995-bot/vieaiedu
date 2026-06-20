import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { walletChange, getBalances } from "@/lib/wallet";
import { notifyAdmins } from "@/lib/notify";
import { getConfig } from "@/lib/settings";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// Học viên gửi yêu cầu rút tiền từ ví HOA HỒNG (real). Trừ tiền ngay (giữ), admin duyệt.
export async function POST(req: Request) {
  if (!rateLimit(`withdraw:${clientIp(req)}`, 5, 60_000)) return NextResponse.json({ error: "Thử lại sau." }, { status: 429 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { amount, bank_name, bank_account, bank_holder } = await req.json().catch(() => ({}));
  const amt = parseInt(amount) || 0;
  const min = parseInt(await getConfig("min_withdraw")) || 50000;
  if (amt < min) return NextResponse.json({ error: `Số tiền rút tối thiểu ${min.toLocaleString("vi-VN")}đ` }, { status: 400 });
  if (!bank_name || !bank_account || !bank_holder) return NextResponse.json({ error: "Vui lòng nhập đủ thông tin ngân hàng" }, { status: 400 });

  const bal = await getBalances(user.id);
  if (amt > bal.real) return NextResponse.json({ error: "Số dư hoa hồng không đủ" }, { status: 400 });

  // Trừ ngay để giữ tiền; admin từ chối sẽ hoàn lại
  const ok = await walletChange(user.id, "real", -amt, "Yêu cầu rút tiền");
  if (!ok) return NextResponse.json({ error: "Không thực hiện được" }, { status: 400 });

  const admin = createAdminClient()!;
  await admin.from("withdrawals").insert({ user_id: user.id, amount: amt, bank_name, bank_account, bank_holder, status: "pending" });
  await notifyAdmins("🏦 Yêu cầu rút tiền mới", `${amt.toLocaleString("vi-VN")}đ → ${bank_holder} (${bank_name} ${bank_account})`, "/admin", { email: true });
  return NextResponse.json({ ok: true });
}
