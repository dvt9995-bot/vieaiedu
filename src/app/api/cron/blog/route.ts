import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rewriteArticle, isGeminiConfigured } from "@/lib/gemini";
import { isCurrentUserAdmin } from "@/lib/admin-guard";

export const maxDuration = 60;

// Nguồn tin AI lớn (RSS/Atom)
const FEEDS: { url: string; name: string }[] = [
  { url: "https://techcrunch.com/category/artificial-intelligence/feed/", name: "TechCrunch" },
  { url: "https://venturebeat.com/category/ai/feed/", name: "VentureBeat" },
  { url: "https://www.theverge.com/ai-artificial-intelligence/rss/index.xml", name: "The Verge" },
  { url: "https://www.technologyreview.com/topic/artificial-intelligence/feed", name: "MIT Tech Review" },
  { url: "https://blog.google/technology/ai/rss/", name: "Google AI" },
];

interface Item { title: string; link: string; summary: string; source: string; }

function decode(s: string) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
function tag(block: string, name: string) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
}

async function parseFeed(f: { url: string; name: string }): Promise<Item[]> {
  try {
    const res = await fetch(f.url, { headers: { "User-Agent": "Mozilla/5.0 VIEAIEDU-Bot" }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const xml = await res.text();
    const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) || [];
    return blocks.slice(0, 8).map((b) => {
      let link = tag(b, "link");
      if (!link) { const m = b.match(/<link[^>]*href="([^"]+)"/i); link = m ? m[1] : ""; }
      return { title: tag(b, "title"), link, summary: (tag(b, "description") || tag(b, "summary") || tag(b, "content")).slice(0, 800), source: f.name };
    }).filter((i) => i.title && i.link);
  } catch { return []; }
}

async function ogImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 VIEAIEDU-Bot" }, signal: AbortSignal.timeout(12000) });
    const html = await res.text();
    const m = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i);
    return m ? m[1] : null;
  } catch { return null; }
}

function slugify(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d")
    .toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 70);
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const cronOk = process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
  if (!cronOk && !(await isCurrentUserAdmin()))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await isGeminiConfigured())) return NextResponse.json({ skipped: "Chưa cấu hình GEMINI_API_KEY" });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "no db" }, { status: 500 });

  // Gom tin từ mọi nguồn
  const all = (await Promise.all(FEEDS.map(parseFeed))).flat();
  // Lọc tin đã đăng
  const { data: existing } = await admin.from("blog_posts").select("source_url");
  const seen = new Set((existing ?? []).map((e) => e.source_url));
  const fresh = all.filter((i) => !seen.has(i.link));

  const TARGET = 3;
  const created: string[] = [];
  for (const item of fresh) {
    if (created.length >= TARGET) break;
    const rw = await rewriteArticle({ title: item.title, summary: item.summary, sourceName: item.source });
    if (!rw) continue;
    const cover = await ogImage(item.link);
    const slug = `${slugify(rw.title)}-${Math.abs(hashCode(item.link)).toString(36).slice(0, 5)}`;
    const body = `${rw.body}\n\n---\n*Nguồn tham khảo: [${item.source}](${item.link})*`;
    const { error } = await admin.from("blog_posts").insert({
      slug, title: rw.title, excerpt: rw.excerpt, body, cover_url: cover,
      source_url: item.link, source_name: item.source, published: true, published_at: new Date().toISOString(),
    });
    if (!error) created.push(rw.title);
  }
  return NextResponse.json({ created: created.length, titles: created, candidates: fresh.length });
}

function hashCode(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return h; }
