import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";

export async function GET(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const days = Math.min(90, Math.max(7, parseInt(new URL(req.url).searchParams.get("days") || "30") || 30));
  const { data, error } = await admin.rpc("marketing_overview", { days });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
