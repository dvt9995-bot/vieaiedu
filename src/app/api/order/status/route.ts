import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Trả trạng thái đơn của user hiện tại (client poll sau khi quét QR).
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ status: "unknown" });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: "unknown" }, { status: 401 });
  const { data } = await supabase
    .from("orders").select("status").eq("id", id).eq("user_id", user.id).maybeSingle();
  return NextResponse.json({ status: data?.status ?? "unknown" });
}
