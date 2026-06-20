import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push";
import { sendGenericEmail } from "@/lib/email";

export type NotifType = "transactional" | "learning" | "community" | "promo" | "system";

interface NotifyInput {
  userId: string;
  type: NotifType;
  title: string;
  body?: string;
  href?: string;
  email?: boolean; // gợi ý gửi email (nếu user bật)
  push?: boolean;  // gợi ý gửi push (nếu user bật)
}

// Mặc định kênh theo nhóm (in-app luôn bật)
const DEFAULTS: Record<NotifType, { email: boolean; push: boolean }> = {
  transactional: { email: true, push: true },
  learning: { email: false, push: true },
  community: { email: false, push: false },
  promo: { email: false, push: false },
  system: { email: false, push: true },
};

/** Điểm vào duy nhất để gửi thông báo (in-app + email + push, tôn trọng tùy chọn user). */
export async function notify(input: NotifyInput) {
  const admin = createAdminClient();
  if (!admin) return;
  const { userId, type, title, body, href } = input;

  // 1) In-app (luôn)
  await admin.from("notifications").insert({ user_id: userId, title, body: body ?? null, href: href ?? null });

  // 2) Tùy chọn người dùng
  const { data: prefRow } = await admin.from("notification_prefs").select("prefs").eq("user_id", userId).maybeSingle();
  const prefs = (prefRow?.prefs ?? {}) as Record<string, { email?: boolean; push?: boolean }>;
  const def = DEFAULTS[type];
  const wantEmail = (input.email ?? def.email) && (prefs[type]?.email ?? true);
  const wantPush = (input.push ?? def.push) && (prefs[type]?.push ?? true);

  // 3) Email
  if (wantEmail) {
    try {
      const { data: u } = await admin.auth.admin.getUserById(userId);
      if (u.user?.email) await sendGenericEmail(u.user.email, title, title, body ?? "", href);
    } catch {}
  }
  // 4) Push
  if (wantPush) await sendPushToUser(userId, { title, body, href });
}

/** Gửi cho tất cả user (broadcast) — chỉ in-app + push (không email hàng loạt ở đây). */
export async function notifyAll(title: string, body?: string, href?: string) {
  const admin = createAdminClient();
  if (!admin) return 0;
  const { data: users } = await admin.from("profiles").select("id");
  if (!users?.length) return 0;
  const rows = users.map((u) => ({ user_id: u.id as string, title, body: body ?? null, href: href ?? null }));
  await admin.from("notifications").insert(rows);
  await Promise.all(users.map((u) => sendPushToUser(u.id as string, { title, body, href })));
  return users.length;
}
