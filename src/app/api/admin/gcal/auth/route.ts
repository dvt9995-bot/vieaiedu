import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { oauthUrl } from "@/lib/gcal";

// Bắt đầu kết nối Google (admin) → chuyển tới trang đồng ý của Google
export async function GET(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const origin = new URL(req.url).origin;
  const url = await oauthUrl(`${origin}/api/admin/gcal/callback`);
  if (!url) return NextResponse.json({ error: "Chưa cấu hình Google Client ID/Secret" }, { status: 400 });
  return NextResponse.redirect(url);
}
