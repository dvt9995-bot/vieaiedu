import { NextResponse } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  const targetId = new URL(req.url).searchParams.get("targetId");
  if (!user || !targetId) return NextResponse.json({ following: false });
  const supabase = await createClient();
  const { data } = await supabase!.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", targetId).maybeSingle();
  return NextResponse.json({ following: !!data });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { targetId, action } = await req.json().catch(() => ({}));
  if (!targetId || targetId === user.id) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const supabase = await createClient();

  if (action === "unfollow") {
    await supabase!.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
    return NextResponse.json({ ok: true, following: false });
  }

  const { error } = await supabase!.from("follows").upsert({ follower_id: user.id, following_id: targetId }, { onConflict: "follower_id,following_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Thông báo cho người được theo dõi (tên người theo dõi)
  const admin = createAdminClient();
  if (admin) {
    const { data: me } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    await notify({
      userId: targetId, type: "community",
      title: "Bạn có người theo dõi mới 🎉",
      body: `${(me?.full_name as string) || "Một học viên"} vừa theo dõi bạn.`,
      href: `/u/${user.id}`,
    });
  }
  return NextResponse.json({ ok: true, following: true });
}
