import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";

function slugify(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d")
    .toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 70) || "bai-viet";
}

export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { data } = await admin.from("blog_posts").select("*").order("published_at", { ascending: false }).limit(200);
  return NextResponse.json({ posts: data ?? [] });
}

export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const b = await req.json();
  if (!b.title) return NextResponse.json({ error: "Thiếu tiêu đề" }, { status: 400 });
  const slug = b.slug?.trim() || `${slugify(b.title)}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await admin.from("blog_posts").insert({
    slug, title: b.title, excerpt: b.excerpt || "", body: b.body || "", cover_url: b.cover_url || null,
    published: b.published !== false, published_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateTag("blog", "max");
  return NextResponse.json({ ok: true, slug });
}

export async function PATCH(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { id, ...rest } = await req.json();
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  const patch: Record<string, unknown> = {};
  for (const k of ["title", "excerpt", "body", "cover_url", "published", "slug"]) if (rest[k] !== undefined) patch[k] = rest[k];
  const { error } = await admin.from("blog_posts").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateTag("blog", "max");
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const id = new URL(req.url).searchParams.get("id");
  await admin.from("blog_posts").delete().eq("id", id);
  revalidateTag("blog", "max");
  return NextResponse.json({ ok: true });
}
