import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Lưu Web Push subscription của thiết bị hiện tại.
export async function POST(req: Request) {
  const sub = await req.json().catch(() => null);
  if (!sub?.endpoint || !sub?.keys) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    { onConflict: "endpoint" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
