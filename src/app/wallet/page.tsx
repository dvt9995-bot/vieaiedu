import type { Metadata } from "next";
import { redirect } from "next/navigation";
import WalletDashboard from "@/components/WalletDashboard";
import { getCurrentUser, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ví & Kiếm tiền", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function WalletPage() {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) redirect("/login?next=/wallet");
  }
  return <WalletDashboard />;
}
