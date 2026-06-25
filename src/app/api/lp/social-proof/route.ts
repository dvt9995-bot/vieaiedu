import { NextResponse } from "next/server";
import { getLiveCourseBySlug } from "@/lib/live";

// Lấy ảnh/video kết quả + feedback học viên của khóa LIVE để hiển thị trên landing tĩnh (đồng bộ trang /live).
export const dynamic = "force-dynamic";
const SLUG = "xay-kenh-tu-dong-bang-ai-kiem-tien-tu-facebook-va-affiliate-shopee";

export async function GET() {
  const c = await getLiveCourseBySlug(SLUG);
  return NextResponse.json({
    resultImages: c?.resultImages ?? [],
    testimonials: (c?.testimonials ?? []).map((t) => ({ name: t.name, avatar: t.avatar || null, role: t.role || null, content: t.content, rating: t.rating || 5 })),
  });
}
