import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

const PUB = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIV = process.env.VAPID_PRIVATE_KEY;
if (PUB && PRIV) {
  try { webpush.setVapidDetails("mailto:hello@vieaiedu.vn", PUB, PRIV); } catch {}
}
export const isPushConfigured = () => !!PUB && !!PRIV;

interface Payload { title: string; body?: string; href?: string; }

/** Gửi web push tới tất cả thiết bị của user; tự dọn subscription hết hạn. */
export async function sendPushToUser(userId: string, payload: Payload) {
  if (!isPushConfigured()) return;
  const admin = createAdminClient();
  if (!admin) return;
  const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", userId);
  if (!subs?.length) return;
  const body = JSON.stringify(payload);
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } }, body);
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }));
}
