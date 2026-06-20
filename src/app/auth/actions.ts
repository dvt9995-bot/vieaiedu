"use server";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";
import { getConfig } from "@/lib/settings";
import { walletChange } from "@/lib/wallet";

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
    const uid = data.user.id;

    // Tặng tiền khuyến mãi cho người dùng mới (admin cấu hình)
    try {
      const bonus = parseInt(await getConfig("signup_credit")) || 0;
      if (bonus > 0) {
        await walletChange(uid, "credit", bonus, "Quà chào mừng thành viên mới");
        await notify({ userId: uid, type: "promo", title: `🎁 Bạn được tặng ${bonus.toLocaleString("vi-VN")}đ`, body: "Số dư khuyến mãi dùng để mua khóa học trên VIE AI EDU. Khám phá ngay!", href: "/courses" });
      }
    } catch {}

    // Quy công người giới thiệu (cookie vie_ref) + thưởng
    try {
      const ref = (await cookies()).get("vie_ref")?.value;
      if (ref && /^[0-9a-f-]{36}$/i.test(ref) && ref !== uid) {
        await admin.from("profiles").update({ referred_by: ref }).eq("id", uid);
        const { data: r } = await admin.from("profiles").select("referral_count").eq("id", ref).maybeSingle();
        if (r) {
          await admin.from("profiles").update({ referral_count: ((r.referral_count as number) || 0) + 1 }).eq("id", ref);
          const reward = parseInt(await getConfig("referral_reward_credit")) || 0;
          if (reward > 0) await walletChange(ref, "credit", reward, "Thưởng giới thiệu bạn mới");
          await notify({ userId: ref, type: "community", title: "Bạn có người được giới thiệu mới 🎉", body: reward > 0 ? `Bạn nhận ${reward.toLocaleString("vi-VN")}đ khuyến mãi. Cảm ơn đã lan tỏa VIE AI EDU!` : "Một người vừa đăng ký qua liên kết của bạn!", href: "/account" });
        }
      }
    } catch {}
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
