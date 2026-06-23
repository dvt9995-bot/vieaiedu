import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { gcalConfigured } from "@/lib/gcal";
import { getConfig } from "@/lib/settings";

// Trạng thái kết nối Google Meet (cho admin)
export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ connected: await gcalConfigured(), hasClient: !!(await getConfig("gcal_client_id", "GCAL_CLIENT_ID")) });
}
