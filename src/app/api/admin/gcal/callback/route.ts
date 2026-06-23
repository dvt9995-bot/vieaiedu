import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { exchangeCode } from "@/lib/gcal";
import { setSetting } from "@/lib/settings";

// Google trả code → đổi lấy refresh_token → lưu → quay về admin
export async function GET(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(`${url.origin}/admin?gcal=error`);
  const refresh = await exchangeCode(code, `${url.origin}/api/admin/gcal/callback`);
  if (!refresh) return NextResponse.redirect(`${url.origin}/admin?gcal=error`);
  await setSetting("gcal_refresh_token", refresh);
  return NextResponse.redirect(`${url.origin}/admin?gcal=connected`);
}
