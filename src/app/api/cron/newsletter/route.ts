import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { sendGenericEmail, isEmailConfigured } from "@/lib/email";
import { notifyAdmins } from "@/lib/notify";
import { getBlogPosts } from "@/lib/blog";

export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const cronOk = process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
  if (!cronOk && !(await isCurrentUserAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await isEmailConfigured())) return NextResponse.json({ skipped: "Chưa cấu hình email (Resend)" });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "no db" }, { status: 500 });

  const posts = (await getBlogPosts()).slice(0, 5);
  if (posts.length === 0) return NextResponse.json({ skipped: "Chưa có bài viết" });

  const { data: subs } = await admin.from("subscribers").select("email");
  const emails = (subs ?? []).map((s) => s.email as string).filter(Boolean);
  if (emails.length === 0) return NextResponse.json({ sent: 0, note: "no subscribers" });

  const items = posts.map((p) => `
    <div style="padding:14px 0;border-bottom:1px solid #eee">
      <a href="https://vieaiedu.vn/blog/${p.slug}" style="font-size:16px;font-weight:700;color:#202124;text-decoration:none">${p.title}</a>
      <p style="color:#565b66;font-size:14px;margin:6px 0 0">${p.excerpt || ""}</p>
    </div>`).join("");
  const body = `<p>Tin tức AI nổi bật tuần này từ VIE AI EDU:</p>${items}`;

  // Gửi theo lô để tránh quá tải
  let sent = 0;
  for (let i = 0; i < emails.length; i += 20) {
    const chunk = emails.slice(i, i + 20);
    await Promise.all(chunk.map((e) => sendGenericEmail(e, "📰 Bản tin AI tuần này · VIE AI EDU", "Bản tin AI tuần này", body, "/blog").then(() => { sent++; }).catch(() => {})));
  }
  await notifyAdmins("📨 Đã gửi bản tin tuần", `Gửi ${sent}/${emails.length} người đăng ký, ${posts.length} bài.`, "/admin");
  return NextResponse.json({ sent, subscribers: emails.length, posts: posts.length });
}
