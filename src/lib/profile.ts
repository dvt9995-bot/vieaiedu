"use client";
import { createClient } from "@/lib/supabase/client";

export interface MyProfile {
  id: string; full_name: string; phone: string; address: string; birthdate: string; bio: string;
  avatar_url: string; student_code: string; email: string; referral_count: number;
  credit_balance: number; real_balance: number;
}

export async function getMyProfile(): Promise<MyProfile | null> {
  const c = createClient();
  if (!c) return null;
  const { data: { user } } = await c.auth.getUser();
  if (!user) return null;
  const { data } = await c.from("profiles").select("full_name, phone, address, birthdate, bio, avatar_url, student_code, referral_count, credit_balance, real_balance").eq("id", user.id).maybeSingle();
  return {
    id: user.id, full_name: data?.full_name || "", phone: data?.phone || "", address: data?.address || "",
    birthdate: data?.birthdate || "", bio: data?.bio || "", avatar_url: data?.avatar_url || "",
    student_code: data?.student_code || "", email: user.email || "", referral_count: data?.referral_count || 0,
    credit_balance: data?.credit_balance || 0, real_balance: data?.real_balance || 0,
  };
}

export async function updateMyProfile(fields: Partial<MyProfile>): Promise<boolean> {
  const c = createClient();
  if (!c) return false;
  const { data: { user } } = await c.auth.getUser();
  if (!user) return false;
  const patch: Record<string, unknown> = {};
  for (const k of ["full_name", "phone", "address", "birthdate", "bio", "avatar_url"] as const)
    if (fields[k] !== undefined) patch[k] = fields[k] || null;
  const { error } = await c.from("profiles").update(patch).eq("id", user.id);
  return !error;
}

export async function uploadAvatar(file: File): Promise<string | null> {
  const c = createClient();
  if (!c) return null;
  const { data: { user } } = await c.auth.getUser();
  if (!user) return null;
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${user.id}/${Date.now()}.${ext}`;
  const { error } = await c.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
  if (error) { console.error("uploadAvatar:", error.message); return null; }
  return c.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

export async function changeEmail(email: string): Promise<string | null> {
  const c = createClient();
  if (!c) return "Chưa cấu hình";
  const { error } = await c.auth.updateUser({ email });
  return error ? error.message : null;
}

export async function changePassword(password: string): Promise<string | null> {
  const c = createClient();
  if (!c) return "Chưa cấu hình";
  const { error } = await c.auth.updateUser({ password });
  return error ? error.message : null;
}
