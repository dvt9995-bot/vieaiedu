import { getConfig } from "@/lib/settings";

// Thống kê live của video YouTube (like/view). Cache RAM 5 phút để tiết kiệm hạn mức API.
const cache = new Map<string, { at: number; data: { likes: number; views: number } }>();
const TTL = 5 * 60_000;

export async function getYouTubeStats(videoId: string): Promise<{ likes: number; views: number } | null> {
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
  const hit = cache.get(videoId);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const key = await getConfig("youtube_api_key", "YOUTUBE_API_KEY");
  if (!key) return null;
  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${key}`, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const d = await r.json();
    const s = d.items?.[0]?.statistics;
    if (!s) return null;
    const data = { likes: Number(s.likeCount) || 0, views: Number(s.viewCount) || 0 };
    cache.set(videoId, { at: Date.now(), data });
    return data;
  } catch { return null; }
}
