import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBalances } from "@/lib/wallet";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ credit: 0, real: 0, total: 0, txns: [], withdrawals: [], referralCount: 0, earned: 0, userId: null });
  const b = await getBalances(user.id);
  const admin = createAdminClient();
  let txns: unknown[] = [], withdrawals: unknown[] = [], referralCount = 0, earned = 0;
  if (admin) {
    const [tx, wd, prof] = await Promise.all([
      admin.from("wallet_transactions").select("kind, amount, reason, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      admin.from("withdrawals").select("amount, status, created_at, bank_name, bank_account").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      admin.from("profiles").select("referral_count").eq("id", user.id).maybeSingle(),
    ]);
    txns = tx.data || [];
    withdrawals = wd.data || [];
    referralCount = (prof.data?.referral_count as number) || 0;
    // Tổng hoa hồng đã nhận (cộng vào ví thật)
    earned = (txns as { kind: string; amount: number }[]).filter((t) => t.kind === "real" && t.amount > 0).reduce((s, t) => s + t.amount, 0);
  }
  return NextResponse.json({ credit: b.credit, real: b.real, total: b.credit + b.real, txns, withdrawals, referralCount, earned, userId: user.id });
}
