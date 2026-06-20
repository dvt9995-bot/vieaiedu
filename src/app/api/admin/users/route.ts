import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";

export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const { data: profiles } = await admin.from("profiles").select("id, role, full_name");
  const roleMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const { data: enr } = await admin.from("enrollments").select("user_id");
  const enrollCount = new Map<string, number>();
  for (const e of enr ?? []) enrollCount.set(e.user_id as string, (enrollCount.get(e.user_id as string) || 0) + 1);
  const users = (list?.users ?? []).map((u) => ({
    id: u.id, email: u.email,
    name: (roleMap.get(u.id)?.full_name as string) || (u.user_metadata?.full_name as string) || "",
    role: (roleMap.get(u.id)?.role as string) || "student",
    banned: !!(u as { banned_until?: string }).banned_until,
    courses: enrollCount.get(u.id) || 0,
    created_at: u.created_at,
  }));
  return NextResponse.json({ users });
}

export async function PATCH(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { id, role, ban } = await req.json();
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  if (role) await admin.from("profiles").update({ role }).eq("id", id);
  if (ban !== undefined) await admin.auth.admin.updateUserById(id, { ban_duration: ban ? "876000h" : "none" });
  return NextResponse.json({ ok: true });
}
