import { createAdminClient } from "@/lib/supabase/admin";

export type WalletKind = "credit" | "real";

// Cộng/trừ ví (atomic qua RPC). delta>0 cộng, <0 trừ. Trả false nếu thất bại/không đủ số dư.
export async function walletChange(userId: string, kind: WalletKind, delta: number, reason: string, refOrder?: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin || !delta) return false;
  const { data } = await admin.rpc("wallet_change", { p_user: userId, p_kind: kind, p_delta: delta, p_reason: reason, p_order: refOrder ?? null });
  return !!data;
}

export async function getBalances(userId: string): Promise<{ credit: number; real: number }> {
  const admin = createAdminClient();
  if (!admin) return { credit: 0, real: 0 };
  const { data } = await admin.from("profiles").select("credit_balance, real_balance").eq("id", userId).maybeSingle();
  return { credit: (data?.credit_balance as number) || 0, real: (data?.real_balance as number) || 0 };
}
