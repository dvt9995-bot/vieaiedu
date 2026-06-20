import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rewriteArticle, isGeminiConfigured, geminiHealthCheck } from "@/lib/gemini";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { notifyAdmins } from "@/lib/notify";
import { getConfig } from "@/lib/settings";

export const maxDuration = 60;

// Chỉ lấy bài trong 10 ngày gần nhất
const MAX_AGE_MS = 10 * 24 * 3600 * 1000;

// Nguồn tin AI mặc định (admin có thể bổ sung qua app_settings: blog_feeds)
const DEFAULT_FEEDS: { url: string; name: string }[] = [
  { url: "https://techcrunch.com/category/artificial-intelligence/feed/", name: "TechCrunch" },
  { url: "https://venturebeat.com/category/ai/feed/", name: "VentureBeat" },
  { url: "https://www.theverge.com/rss/ai/index.xml", name: "The Verge" },
  { url: "https://www.technologyreview.com/topic/artificial-intelligence/feed", name: "MIT Tech Review" },
  { url: "https://blog.google/technology/ai/rss/", name: "Google AI" },
  { url: "https://the-decoder.com/feed/", name: "The Decoder" },
  { url: "https://www.artificialintelligence-news.com/feed/", name: "AI News" },
  { url: "https://openai.com/news/rss.xml", name: "OpenAI" },
  { url: "https://www.marktechpost.com/feed/", name: "MarkTechPost" },
];

interface Item { title: string; link: string; summary: string; source: string; ts: number; }

// Đọc cấu hình nguồn: mỗi dòng "url | Tên nguồn" (hoặc chỉ url). Gộp với mặc định, khử trùng url.
async function getFeeds(): Promise<{ url: string; name: string }[]> {
  const raw = await getConfig("blog_feeds");
  const custom: { url: string; name: string }[] = [];
  for (const line of (raw || "").split("\n")) {
    const t = line.trim();
    if (!t || !t.startsWith("http")) continue;
    const [url, name] = t.split("|").map((x) => x.trim());
    custom.push({ url, name: name || new URL(url).hostname.replace(/^www\./, "") });
  }
  const map = new Map<string, { url: string; name: string }>();
  for (const f of [...DEFAULT_FEEDS, ...custom]) map.set(f.url, f);
  return [...map.values()];
}

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
    const res = await fetch(f.url, { headers: { "User-Agent": "Mozilla/5.0 VIEAIEDU-Bot" }, redirect: "follow", signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const xml = await res.text();
    const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) || [];
    return blocks.slice(0, 10).map((b) => {
      let link = tag(b, "link");
      if (!link) { const m = b.match(/<link[^>]*href="([^"]+)"/i); link = m ? m[1] : ""; }
      const dateStr = tag(b, "pubDate") || tag(b, "published") || tag(b, "updated");
      const ts = dateStr ? Date.parse(dateStr) || 0 : 0;
      return { title: tag(b, "title"), link, summary: (tag(b, "description") || tag(b, "summary") || tag(b, "content")).slice(0, 800), source: f.name, ts };
    }).filter((i) => i.title && i.link);
  } catch { return []; }
}

// Trích nhiều ảnh từ trang nguồn: og:image + ảnh nội dung, lọc icon/logo/pixel.
async function extractImages(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 VIEAIEDU-Bot" }, redirect: "follow", signal: AbortSignal.timeout(8000) });
    const html = await res.text();
    const out: string[] = [];
    const push = (u?: string | null) => {
      if (!u) return;
      let s = u.trim();
      if (s.startsWith("//")) s = "https:" + s;
      if (!/^https?:\/\//i.test(s)) return;
      if (/\.svg($|\?)|data:|sprite|logo|icon|avatar|favicon|pixel|1x1|blank|placeholder|gravatar|emoji/i.test(s)) return;
      if (!out.includes(s)) out.push(s);
    };
    // og/twitter image trước
    for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image(?::url)?|twitter:image)["'][^>]+content=["']([^"']+)["']/gi)) push(m[1]);
    // ảnh nội dung (src + lazy data-src/srcset)
    for (const m of html.matchAll(/<img[^>]+(?:data-src|data-original|src)=["']([^"']+)["']/gi)) push(m[1]);
    for (const m of html.matchAll(/<source[^>]+srcset=["']([^"'\s,]+)/gi)) push(m[1]);
    return out.slice(0, 6);
  } catch { return []; }
}

function slugify(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d")
    .toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 70);
}
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const cronOk = process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
  if (!cronOk && !(await isCurrentUserAdmin()))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "no db" }, { status: 500 });

  try {
    if (!(await isGeminiConfigured())) {
      await notifyAdmins("⚠️ Blog tự động chưa chạy", "Chưa cấu hình Gemini API key. Vào Admin → Cài đặt để thêm.", "/admin");
      return NextResponse.json({ skipped: "Chưa cấu hình GEMINI_API_KEY" });
    }
    // Kiểm tra API trước (phát hiện hết tín dụng / sai key / model gỡ)
    const health = await geminiHealthCheck();
    if (!health.ok) {
      await notifyAdmins("🔴 Lỗi API Gemini — blog dừng tạo", `${health.reason}. Kiểm tra API key / hạn mức trong Admin → Cài đặt.`, "/admin", { email: true });
      return NextResponse.json({ error: "gemini", reason: health.reason }, { status: 200 });
    }

    const feeds = await getFeeds();
    const cutoff = Date.now() - MAX_AGE_MS;
    // Gom tin, ưu tiên MỚI NHẤT, chỉ giữ bài ≤10 ngày (có ngày đăng hợp lệ)
    const all = (await Promise.all(feeds.map(parseFeed))).flat()
      .filter((i) => i.ts >= cutoff)
      .sort((a, b) => b.ts - a.ts);

    // Chống trùng: theo link nguồn VÀ theo tiêu đề đã đăng
    const { data: existing } = await admin.from("blog_posts").select("source_url, title");
    const seenUrl = new Set((existing ?? []).map((e) => e.source_url).filter(Boolean));
    const seenTitle = new Set((existing ?? []).map((e) => norm(e.title || "")));
    const batchTitle = new Set<string>();
    const fresh = all.filter((i) => {
      const nt = norm(i.title);
      if (seenUrl.has(i.link) || seenTitle.has(nt) || batchTitle.has(nt)) return false;
      batchTitle.add(nt);
      return true;
    });

    if (fresh.length === 0) {
      await notifyAdmins("📭 Hết bài mới để đăng", `Không còn tin AI mới (≤10 ngày, chưa trùng) từ ${feeds.length} nguồn. Hãy bổ sung nguồn ở Admin → Blog → Nguồn tin.`, "/admin");
      return NextResponse.json({ created: 0, candidates: 0, feeds: feeds.length, note: "no fresh" });
    }

    const TARGET = 3;
    const created: string[] = [];
    let writeErrors = 0;
    for (const item of fresh) {
      if (created.length >= TARGET) break;
      const rw = await rewriteArticle({ title: item.title, summary: item.summary, sourceName: item.source });
      if (!rw) { writeErrors++; continue; }
      if (seenTitle.has(norm(rw.title))) continue;
      const images = await extractImages(item.link);
      const slug = `${slugify(rw.title)}-${Math.abs(hashCode(item.link)).toString(36).slice(0, 5)}`;
      const body = `${rw.body}\n\n---\n*Nguồn tham khảo: [${item.source}](${item.link})*`;
      const { error } = await admin.from("blog_posts").insert({
        slug, title: rw.title, excerpt: rw.excerpt, body, cover_url: images[0] ?? null, images,
        source_url: item.link, source_name: item.source, published: true, published_at: new Date().toISOString(),
      });
      if (!error) { created.push(rw.title); seenTitle.add(norm(rw.title)); }
    }

    // Thông báo kết quả cho admin
    if (created.length === 0)
      await notifyAdmins("🔴 Blog: không tạo được bài", `Có ${fresh.length} tin nhưng viết lại đều lỗi. Có thể lỗi/hết hạn mức Gemini.`, "/admin", { email: true });
    else if (created.length < TARGET)
      await notifyAdmins("🟡 Blog: tạo thiếu bài", `Chỉ đăng ${created.length}/${TARGET} bài. Cân nhắc thêm nguồn để có thêm tin mới.`, "/admin");
    else
      await notifyAdmins("✅ Blog: đã đăng 3 bài mới", created.map((t) => `• ${t}`).join("\n"), "/blog");

    return NextResponse.json({ created: created.length, titles: created, candidates: fresh.length, feeds: feeds.length, writeErrors });
  } catch (e) {
    await notifyAdmins("🔴 Lỗi hệ thống khi tạo blog", String((e as Error)?.message || e).slice(0, 200), "/admin", { email: true });
    return NextResponse.json({ error: "exception" }, { status: 500 });
  }
}

function hashCode(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return h; }
