import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Client service-role (bỏ qua RLS) — CHỈ dùng phía server (webhook). */
export function createAdminClient() {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export const isAdminConfigured = () => !!url && !!serviceKey;
