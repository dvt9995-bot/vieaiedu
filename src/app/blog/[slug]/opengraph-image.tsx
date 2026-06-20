import { ImageResponse } from "next/og";
import { getBlogPostBySlug } from "@/lib/blog";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "VIE AI EDU";

export default async function Og({ params }: { params: { slug: string } }) {
  let title = "Tin tức AI · VIE AI EDU";
  try { const p = await getBlogPostBySlug(params.slug); if (p?.title) title = p.title; } catch {}
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "linear-gradient(135deg,#e41e26 0%,#a3141a 100%)", padding: 70, color: "#fff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 38, fontWeight: 800, letterSpacing: -1 }}>VIE AI EDU</div>
        <div style={{ display: "flex", fontSize: title.length > 70 ? 56 : 68, fontWeight: 800, lineHeight: 1.1, maxWidth: 1040 }}>{title}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 30, opacity: 0.9 }}>
          <span>vieaiedu.vn</span>
          <span>Cộng đồng AI người Việt</span>
        </div>
      </div>
    ),
    size
  );
}
