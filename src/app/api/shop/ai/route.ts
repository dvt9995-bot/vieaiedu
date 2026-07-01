import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/shop";
import { suggestProductName, suggestProductDescription, beautifyProductDescription } from "@/lib/gemini";

export const maxDuration = 30;

// AI hỗ trợ người bán: field = "name" | "description" | "beautify".
export async function POST(req: Request) {
  const u = await requireSeller();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { field, title, type, text, hint } = await req.json().catch(() => ({}));

  if (field === "name") {
    const h = String(hint || title || "").trim();
    if (!h) return NextResponse.json({ error: "Nhập vài từ gợi ý về sản phẩm trước" }, { status: 400 });
    const name = await suggestProductName(h, type);
    if (!name) return NextResponse.json({ error: "AI chưa gợi ý được (kiểm tra Gemini key)" }, { status: 502 });
    return NextResponse.json({ ok: true, name });
  }

  const t = String(title || "").trim();
  if (!t) return NextResponse.json({ error: "Nhập tên sản phẩm trước" }, { status: 400 });

  if (field === "beautify") {
    if (!String(text || "").trim()) return NextResponse.json({ error: "Chưa có nội dung để làm đẹp" }, { status: 400 });
    const description = await beautifyProductDescription(t, String(text));
    if (!description) return NextResponse.json({ error: "AI chưa xử lý được (kiểm tra Gemini key)" }, { status: 502 });
    return NextResponse.json({ ok: true, description });
  }

  const description = await suggestProductDescription(t, type);
  if (!description) return NextResponse.json({ error: "AI chưa gợi ý được (kiểm tra Gemini key)" }, { status: 502 });
  return NextResponse.json({ ok: true, description });
}
