import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Kiểm tra trạng thái ủng hộ (cho client poll sau khi quét QR).
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ status: "unknown" });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ status: "unknown" });
  const { data } = await admin.from("donations").select("status").eq("id", id).maybeSingle();
  return NextResponse.json({ status: (data?.status as string) || "pending" });
}
