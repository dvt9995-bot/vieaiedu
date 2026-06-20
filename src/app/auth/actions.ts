"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { error?: string };

export async function signIn(_prev: Result, formData: FormData): Promise<Result> {
  if (!isSupabaseConfigured()) return { error: "Chưa cấu hình Supabase (điền NEXT_PUBLIC_SUPABASE_URL/ANON_KEY)." };
  const supabase = await createClient();
  const { error } = await supabase!.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signUp(_prev: Result, formData: FormData): Promise<Result> {
  if (!isSupabaseConfigured()) return { error: "Chưa cấu hình Supabase." };
  const supabase = await createClient();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const { data, error } = await supabase!.auth.signUp({
    email, password,
    options: { data: { full_name: String(formData.get("full_name") || "") } },
  });
  if (error) return { error: error.message };

  // Tự xác nhận email (service role) để đăng nhập được ngay — bỏ rào cản verify mail.
  const admin = createAdminClient();
  if (admin && data.user) {
    await admin.auth.admin.updateUserById(data.user.id, { email_confirm: true }).catch(() => {});
  }
  // Tạo phiên đăng nhập ngay
  await supabase!.auth.signInWithPassword({ email, password });
  redirect("/dashboard");
}

export async function signInWithGoogle(): Promise<void> {
  if (!isSupabaseConfigured()) redirect("/login?error=unconfigured");
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { data } = await supabase!.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  redirect(data?.url ?? "/login?error=oauth");
}

// Dùng cho modal (chọn login/register qua field ẩn "mode").
export async function authAction(prev: Result, formData: FormData): Promise<Result> {
  return formData.get("mode") === "register" ? signUp(prev, formData) : signIn(prev, formData);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/");
}
