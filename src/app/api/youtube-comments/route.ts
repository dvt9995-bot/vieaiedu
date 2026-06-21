import { NextResponse } from "next/server";
import { getConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

// Cache nhẹ trong RAM (5 phút/video) để đỡ tốn hạn mức YouTube Data API.
type Cmt = { id: string; author: string; avatar: string; text: string; likes: number; time: string };
const cache = new Map<string, { at: number; data: Cmt[] }>();
const TTL = 5 * 60_000;

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return NextResponse.json({ comments: [] });

  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json({ comments: hit.data, cached: true });

  const key = await getConfig("youtube_api_key", "YOUTUBE_API_KEY");
  if (!key) return NextResponse.json({ comments: [], disabled: true });

  try {
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${id}&maxResults=20&order=relevance&textFormat=plainText&key=${key}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      const reason = j?.error?.errors?.[0]?.reason || "";
      // Bình luận bị tắt / video riêng tư → coi như rỗng (không phải lỗi hệ thống)
      if (reason === "commentsDisabled" || reason === "videoNotFound") return NextResponse.json({ comments: [], note: reason });
      return NextResponse.json({ comments: [], error: reason || `http ${r.status}` });
    }
    const data = await r.json();
    const comments: Cmt[] = (data.items || []).map((it: Record<string, unknown>) => {
      const s = ((it.snippet as Record<string, unknown>).topLevelComment as Record<string, unknown>).snippet as Record<string, unknown>;
      return {
        id: it.id as string,
        author: (s.authorDisplayName as string) || "Người xem",
        avatar: (s.authorProfileImageUrl as string) || "",
        text: (s.textDisplay as string) || "",
        likes: Number(s.likeCount) || 0,
        time: (s.publishedAt as string) || "",
      };
    });
    cache.set(id, { at: Date.now(), data: comments });
    return NextResponse.json({ comments });
  } catch {
    return NextResponse.json({ comments: [], error: "fetch_failed" });
  }
}
