import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Kiểm tra nhóm đơn (theo mã) đã thanh toán chưa — cho QR poll.
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return NextResponse.json({ paid: false });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ paid: false });
  const { data } = await admin.from("shop_orders").select("status").eq("code", code);
  const rows = data || [];
  const paid = rows.length > 0 && rows.every((o) => o.status !== "pending");
  return NextResponse.json({ paid });
}
