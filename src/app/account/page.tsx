import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AccountClient from "@/components/AccountClient";
import { isSupabaseConfigured, getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Cài đặt tài khoản", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) redirect("/login?next=/account");
  }
  return <AccountClient />;
}
