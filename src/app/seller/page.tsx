import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SellerStudio from "@/components/shop/SellerStudio";
import { getCurrentUser, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Kênh người bán", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SellerPage() {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) redirect("/login?next=/seller");
  }
  return <SellerStudio />;
}
