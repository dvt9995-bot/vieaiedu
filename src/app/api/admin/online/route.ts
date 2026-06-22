import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";

// Số người đang trực tuyến (hoạt động ≤5 phút) — endpoint nhẹ để poll thời gian thực.
export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { data, error } = await admin.rpc("online_now");
  if (error) return NextResponse.json({ online: 0, online_users: 0, today_visits: 0 });
  return NextResponse.json(data);
}
