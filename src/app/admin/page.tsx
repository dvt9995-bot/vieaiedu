import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminClient from "@/components/AdminClient";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Quản trị", robots: { index: false } };

export default async function AdminPage() {
  // Khi đã cấu hình Supabase: chỉ cho role=admin. (Chế độ demo chưa cấu hình thì để mở.)
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) redirect("/login?next=/admin");
    const { data: profile } = await supabase!.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") redirect("/");
  }
  return <AdminClient />;
}
