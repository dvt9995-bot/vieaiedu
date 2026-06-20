import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";

export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const [overview, revenue, signups, top] = await Promise.all([
    admin.rpc("admin_overview"),
    admin.rpc("revenue_by_day", { days: 30 }),
    admin.rpc("signups_by_day", { days: 30 }),
    admin.rpc("top_courses"),
  ]);
  return NextResponse.json({
    overview: overview.data ?? {},
    revenue: revenue.data ?? [],
    signups: signups.data ?? [],
    top: top.data ?? [],
  });
}
