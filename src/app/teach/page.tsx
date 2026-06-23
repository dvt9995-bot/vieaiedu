import type { Metadata } from "next";
import { redirect } from "next/navigation";
import StudioClient from "@/components/teach/StudioClient";
import { getCurrentUser, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Khu giảng viên", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function TeachPage() {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) redirect("/login?next=/teach");
  }
  return <StudioClient />;
}
