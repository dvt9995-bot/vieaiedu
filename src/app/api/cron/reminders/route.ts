import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";

// Cron hằng ngày: nhắc học viên lâu không vào học.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "unconfigured" }, { status: 503 });

  const { data } = await admin.rpc("inactive_learners", { days: 3 });
  const users = (data as { user_id: string }[]) || [];
  let sent = 0;
  for (const u of users.slice(0, 300)) {
    await notify({
      userId: u.user_id, type: "learning",
      title: "Tiếp tục hành trình AI của bạn 📚",
      body: "Bạn có khóa học đang dang dở. Quay lại học hôm nay nhé!",
      href: "/dashboard", email: false,
    });
    sent++;
  }
  return NextResponse.json({ ok: true, sent });
}
