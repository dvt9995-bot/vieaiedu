import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// Thu thập sự kiện first-party (pageview + sự kiện hành vi) cho Marketing Dashboard.
export async function POST(req: Request) {
  if (!rateLimit(`ev:${clientIp(req)}`, 80, 60_000)) return NextResponse.json({ ok: false }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const event = String(b.event || "").slice(0, 60);
  if (!event) return NextResponse.json({ ok: false }, { status: 400 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: true });

  let userId: string | null = null;
  try { const s = await createClient(); const { data } = await s!.auth.getUser(); userId = data.user?.id ?? null; } catch { /* khách vãng lai */ }

  await admin.from("analytics_events").insert({
    anon_id: (String(b.anon || "").slice(0, 40)) || null,
    user_id: userId,
    event,
    path: (String(b.path || "").slice(0, 200)) || null,
    ref: (String(b.ref || "").slice(0, 200)) || null,
    props: b.props && typeof b.props === "object" ? b.props : null,
  });
  return NextResponse.json({ ok: true });
}
