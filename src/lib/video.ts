// Phân giải nguồn video của bài học. Bunny: lưu GUID thô. YouTube: lưu "yt:<id>".
export type VideoRef = { kind: "youtube"; id: string } | { kind: "bunny"; id: string };

/** Lấy YouTube video id từ URL hoặc id thuần. Trả null nếu không phải YouTube. */
export function parseYouTubeId(input: string): string | null {
  const s = (input || "").trim();
  if (!s) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s; // id thuần
  const m = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

/** Chuẩn hóa input admin nhập (URL YouTube / id YouTube / GUID Bunny) → giá trị lưu DB. */
export function normalizeVideoInput(input: string): string | null {
  const s = (input || "").trim();
  if (!s) return null;
  const yt = parseYouTubeId(s);
  if (yt) return `yt:${yt}`;
  return s; // coi như Bunny GUID
}

/** Đọc giá trị video_id đã lưu → loại nguồn + id. */
export function parseVideoRef(videoId?: string | null): VideoRef | null {
  if (!videoId) return null;
  if (videoId.startsWith("yt:")) return { kind: "youtube", id: videoId.slice(3) };
  return { kind: "bunny", id: videoId };
}

/** Tạo slug từ tiếng Việt (bỏ dấu, chữ thường, nối gạch). */
export function slugify(text: string): string {
  return (text || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Lấy TÊN KÊNH của video YouTube qua oEmbed (không cần API key). Dùng phía server. */
export async function youtubeChannelName(videoId: string): Promise<string | null> {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const d = await r.json();
    return (d.author_name as string) || null;
  } catch { return null; }
}
