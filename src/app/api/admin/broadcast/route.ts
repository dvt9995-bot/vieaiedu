import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { notifyAll } from "@/lib/notify";

export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { title, body, href } = await req.json();
  if (!title) return NextResponse.json({ error: "Thiếu tiêu đề" }, { status: 400 });
  const count = await notifyAll(title, body || undefined, href || undefined);
  return NextResponse.json({ ok: true, sent: count });
}
