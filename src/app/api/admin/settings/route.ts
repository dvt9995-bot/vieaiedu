import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { getAllSettings, clearSettingsCache } from "@/lib/settings";

export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ settings: await getAllSettings() });
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
