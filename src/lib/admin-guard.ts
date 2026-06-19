import { createClient } from "@/lib/supabase/server";

/** Trả về true nếu user hiện tại là admin (dùng trong API route). */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "admin";
}
