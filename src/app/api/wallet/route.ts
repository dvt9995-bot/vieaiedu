import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBalances } from "@/lib/wallet";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ credit: 0, real: 0, total: 0, txns: [] });
  const b = await getBalances(user.id);
  const admin = createAdminClient();
  const { data: txns } = admin ? await admin.from("wallet_transactions").select("kind, amount, reason, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20) : { data: [] };
  return NextResponse.json({ credit: b.credit, real: b.real, total: b.credit + b.real, txns: txns || [] });
}
