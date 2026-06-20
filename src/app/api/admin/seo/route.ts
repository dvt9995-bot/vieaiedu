import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { generateSeoMeta, isGeminiConfigured } from "@/lib/gemini";

export const maxDuration = 60;

// AI tối ưu SEO cho khóa học. body: { id?: string, force?: boolean }
// Không có id → quét toàn bộ khóa thiếu SEO (hoặc force=true để làm lại hết).
export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!(await isGeminiConfigured())) return NextResponse.json({ skipped: "Chưa cấu hình Gemini API key" });
  const admin = createAdminClient()!;
  const { id, force } = await req.json().catch(() => ({}));

  let q = admin.from("courses").select("id, title, subtitle, description, seo_title");
  if (id) q = q.eq("id", id);
  const { data: courses } = await q;
  if (!courses?.length) return NextResponse.json({ updated: 0 });

  let updated = 0;
  for (const c of courses) {
    if (!force && c.seo_title) continue; // bỏ qua khóa đã có SEO (trừ khi force)
    const meta = await generateSeoMeta({ name: c.title as string, context: (c.subtitle as string) || (c.description as string)?.slice(0, 300) });
    if (!meta) continue;
    const { error } = await admin.from("courses").update({ seo_title: meta.seo_title, seo_description: meta.seo_description }).eq("id", c.id);
    if (!error) updated++;
  }
  if (updated) revalidateTag("courses", "max");
  return NextResponse.json({ updated, total: courses.length });
}
