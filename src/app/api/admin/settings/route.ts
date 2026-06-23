import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { getAllSettings, clearSettingsCache, CONFIG_KEYS } from "@/lib/settings";

export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const settings = await getAllSettings();
  // Trạng thái mỗi khóa: đã cấu hình chưa + nguồn (db = admin nhập, env = biến môi trường Vercel).
  // KHÔNG trả giá trị secret từ env — chỉ trả cờ boolean + nguồn.
  const status: Record<string, { set: boolean; source: "db" | "env" | null }> = {};
  for (const [key, envKey] of Object.entries(CONFIG_KEYS)) {
    const inDb = !!settings[key];
    const inEnv = !!(envKey && process.env[envKey as string]);
    status[key] = { set: inDb || inEnv, source: inDb ? "db" : inEnv ? "env" : null };
  }
  return NextResponse.json({ settings, status });
}

// Lưu nhiều cấu hình cùng lúc: { values: { key: value, ... } }
export async function PUT(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { values } = await req.json();
  if (!values || typeof values !== "object") return NextResponse.json({ error: "Thiếu values" }, { status: 400 });
  const rows = Object.entries(values).map(([key, value]) => ({ key, value: value == null ? null : String(value), updated_at: new Date().toISOString() }));
  const { error } = await admin.from("app_settings").upsert(rows, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  clearSettingsCache();
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
