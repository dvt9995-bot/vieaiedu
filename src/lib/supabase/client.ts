"use client";
import { createBrowserClient } from "@supabase/ssr";

// Cookie phiên bền 1 năm để KHÔNG mất đăng nhập khi đóng trình duyệt / đổi tab.
export const AUTH_COOKIE_OPTIONS = { maxAge: 60 * 60 * 24 * 365, path: "/", sameSite: "lax" as const };

/**
 * Supabase browser client.
 * Trả về null nếu chưa cấu hình env (giai đoạn dùng mock data).
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key, { cookieOptions: AUTH_COOKIE_OPTIONS });
}

export const isSupabaseConfigured = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
