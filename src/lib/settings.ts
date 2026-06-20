import { createAdminClient } from "@/lib/supabase/admin";

// Đọc cấu hình từ app_settings (DB) với fallback về env. Cache nhẹ trong RAM.
let cache: { at: number; data: Record<string, string> } | null = null;
const TTL = 30_000;

export async function getAllSettings(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  const admin = createAdminClient();
  const data: Record<string, string> = {};
  if (admin) {
    const { data: rows } = await admin.from("app_settings").select("key, value");
    for (const r of rows ?? []) if (r.value != null) data[r.key as string] = r.value as string;
  }
  cache = { at: Date.now(), data };
  return data;
}

export function clearSettingsCache() { cache = null; }

/** Giá trị cấu hình: ưu tiên DB (admin sửa), fallback env. */
export async function getConfig(key: string, envKey?: string): Promise<string> {
  const s = await getAllSettings();
  if (s[key]) return s[key];
  if (envKey && process.env[envKey]) return process.env[envKey] as string;
  return "";
}

// Bản đồ key cấu hình → env fallback (nguồn sự thật khi admin chưa đặt)
export const CONFIG_KEYS = {
  sepay_account: "SEPAY_ACCOUNT",
  sepay_bank: "SEPAY_BANK",
  sepay_webhook_key: "SEPAY_WEBHOOK_API_KEY",
  bunny_library_id: "BUNNY_STREAM_LIBRARY_ID",
  bunny_api_key: "BUNNY_STREAM_API_KEY",
  bunny_token_key: "BUNNY_STREAM_TOKEN_KEY",
  resend_api_key: "RESEND_API_KEY",
  resend_from: "RESEND_FROM",
  gemini_api_key: "GEMINI_API_KEY",
  gemini_model: "",
  blog_feeds: "",
  ga_id: "NEXT_PUBLIC_GA_ID",
  fb_pixel_id: "",
  tiktok_pixel_id: "",
  seo_title: "",
  seo_description: "",
  seo_og_image: "",
  signup_credit: "",
  referral_reward_credit: "",
  referral_commission_pct: "",
  min_withdraw: "",
  hero_bg_image: "",
  hero_bg_video: "",
} as const;
