import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = () => !!url && !!key;

/** Supabase server client (đọc/ghi cookie phiên). Trả null nếu chưa cấu hình env. */
export async function createClient() {
  if (!url || !key) return null;
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // gọi từ Server Component — bỏ qua, middleware sẽ refresh.
        }
      },
    },
  });
}

/** Lấy user hiện tại (null nếu chưa đăng nhập hoặc chưa cấu hình). */
export async function getCurrentUser() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
