import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSeller } from "@/lib/shop";
import { notify } from "@/lib/notify";

// GET ?product_id= : hỏi đáp công khai 1 SP. GET ?seller=1 : tất cả câu hỏi SP của shop mình (chưa trả lời lên đầu).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ items: [] });
  if (url.searchParams.get("seller") === "1") {
    const u = await requireSeller();
    if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const { data: prods } = await admin.from("shop_products").select("id, title").eq("shop_id", u.shopId);
    const pmap = new Map((prods || []).map((p) => [p.id as string, p.title as string]));
    if (!pmap.size) return NextResponse.json({ items: [] });
    const { data } = await admin.from("shop_product_qa").select("id, product_id, question, answer, answered_at, created_at, profiles(full_name)").in("product_id", [...pmap.keys()]).order("created_at", { ascending: false }).limit(100);
    const items = (data ?? []).map((q) => ({ id: q.id, product: pmap.get(q.product_id as string) || "", question: q.question, answer: q.answer, answered_at: q.answered_at, name: (q.profiles as { full_name?: string })?.full_name || "Khách" }));
    items.sort((a, b) => (a.answer ? 1 : 0) - (b.answer ? 1 : 0)); // chưa trả lời lên đầu
    return NextResponse.json({ items });
  }
  const pid = url.searchParams.get("product_id");
  if (!pid) return NextResponse.json({ items: [] });
  const { data } = await admin.from("shop_product_qa").select("id, question, answer, answered_at, created_at, profiles(full_name)").eq("product_id", pid).order("created_at", { ascending: false }).limit(50);
  const items = (data ?? []).map((q) => ({ id: q.id, question: q.question, answer: q.answer, answered_at: q.answered_at, created_at: q.created_at, name: (q.profiles as { full_name?: string })?.full_name || "Khách" }));
  return NextResponse.json({ items });
}

// POST {product_id, question} : người mua đặt câu hỏi → báo người bán
export async function POST(req: Request) {
  const s = await createClient();
  if (!s) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { product_id, question } = await req.json().catch(() => ({}));
  if (!product_id || !String(question || "").trim()) return NextResponse.json({ error: "Nhập câu hỏi" }, { status: 400 });
  const admin = createAdminClient()!;
  const { data: p } = await admin.from("shop_products").select("shop_id, title").eq("id", product_id).maybeSingle();
  await admin.from("shop_product_qa").insert({ product_id, user_id: user.id, question: String(question).slice(0, 500) });
  if (p?.shop_id) { const { data: shop } = await admin.from("shops").select("owner_id").eq("id", p.shop_id).maybeSingle(); if (shop?.owner_id) await notify({ userId: shop.owner_id as string, type: "transactional", title: "❓ Câu hỏi mới về sản phẩm", body: `"${p.title}" có câu hỏi mới — vào Kênh người bán trả lời.`, href: "/seller" }); }
  return NextResponse.json({ ok: true });
}

// PATCH {id, answer} : người bán trả lời (chỉ QA thuộc SP của shop mình)
export async function PATCH(req: Request) {
  const u = await requireSeller();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { id, answer } = await req.json().catch(() => ({}));
  if (!id || !String(answer || "").trim()) return NextResponse.json({ error: "Nhập câu trả lời" }, { status: 400 });
  const { data: qa } = await admin.from("shop_product_qa").select("id, product_id, user_id").eq("id", id).maybeSingle();
  if (!qa) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { data: p } = await admin.from("shop_products").select("shop_id, title, slug").eq("id", qa.product_id).maybeSingle();
  if (p?.shop_id !== u.shopId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await admin.from("shop_product_qa").update({ answer: String(answer).slice(0, 800), answered_at: new Date().toISOString() }).eq("id", id);
  if (qa.user_id) await notify({ userId: qa.user_id as string, type: "transactional", title: "💬 Người bán đã trả lời", body: `Câu hỏi của bạn về "${p?.title}" đã được trả lời.`, href: `/shop/p/${p?.slug}` });
  return NextResponse.json({ ok: true });
}
