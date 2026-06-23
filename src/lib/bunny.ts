import crypto from "crypto";
import { getConfig } from "@/lib/settings";

// Bunny Stream embed (token chống tải trộm nếu có token key). Cấu hình từ app_settings → env.
export async function isBunnyConfigured() {
  return !!(await getConfig("bunny_library_id", "BUNNY_STREAM_LIBRARY_ID"));
}

export async function bunnyEmbedUrl(videoId: string, expiresInSec = 3 * 3600): Promise<string> {
  const lib = await getConfig("bunny_library_id", "BUNNY_STREAM_LIBRARY_ID");
  if (!lib) return "";
  const base = `https://iframe.mediadelivery.net/embed/${lib}/${videoId}`;
  const key = await getConfig("bunny_token_key", "BUNNY_STREAM_TOKEN_KEY");
  if (!key) return base;
  const expires = Math.floor(Date.now() / 1000) + expiresInSec;
  const path = `/embed/${lib}/${videoId}`;
  const token = crypto.createHash("sha256").update(key + path + expires).digest("hex");
  return `${base}?token=${token}&expires=${expires}`;
}

// ===== Upload trực tiếp browser → Bunny (giảng viên đăng video khóa thu phí) =====
// Cần Stream API Key (bunny_api_key). Tạo "video object" phía server rồi ký chữ ký TUS để
// trình duyệt tải file thẳng lên Bunny (không qua server mình → chịu file lớn + có tiến trình).
export async function isBunnyUploadConfigured(): Promise<boolean> {
  return !!(await getConfig("bunny_library_id", "BUNNY_STREAM_LIBRARY_ID")) && !!(await getConfig("bunny_api_key", "BUNNY_STREAM_API_KEY"));
}

export async function createBunnyVideo(title: string): Promise<{ libraryId: string; videoId: string } | null> {
  const lib = await getConfig("bunny_library_id", "BUNNY_STREAM_LIBRARY_ID");
  const key = await getConfig("bunny_api_key", "BUNNY_STREAM_API_KEY");
  if (!lib || !key) return null;
  const res = await fetch(`https://video.bunnycdn.com/library/${lib}/videos`, {
    method: "POST",
    headers: { AccessKey: key, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ title: (title || "Bài học").slice(0, 200) }),
  });
  if (!res.ok) return null;
  const j = await res.json().catch(() => null);
  if (!j?.guid) return null;
  return { libraryId: String(lib), videoId: String(j.guid) };
}

// Tạo video + bảo Bunny TỰ TẢI từ URL nguồn (kèm headers xác thực). File nặng không qua server mình.
// Dùng cho: tự kéo bản ghi Meet từ Google Drive về Bunny. Trả videoId (GUID) hoặc null.
export async function fetchBunnyFromUrl(title: string, sourceUrl: string, headers?: Record<string, string>): Promise<string | null> {
  const key = await getConfig("bunny_api_key", "BUNNY_STREAM_API_KEY");
  const v = await createBunnyVideo(title);
  if (!key || !v) return null;
  const res = await fetch(`https://video.bunnycdn.com/library/${v.libraryId}/videos/${v.videoId}/fetch`, {
    method: "POST",
    headers: { AccessKey: key, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ url: sourceUrl, headers: headers || {} }),
  });
  if (!res.ok) return null;
  return v.videoId;
}

// Chữ ký phiên upload TUS — KHÔNG lộ API key ra trình duyệt, chỉ trả signature có hạn dùng.
export async function bunnyUploadAuth(videoId: string, ttlSec = 3 * 3600): Promise<{ libraryId: string; videoId: string; expire: number; signature: string; endpoint: string } | null> {
  const lib = await getConfig("bunny_library_id", "BUNNY_STREAM_LIBRARY_ID");
  const key = await getConfig("bunny_api_key", "BUNNY_STREAM_API_KEY");
  if (!lib || !key) return null;
  const expire = Math.floor(Date.now() / 1000) + ttlSec;
  const signature = crypto.createHash("sha256").update(String(lib) + key + expire + videoId).digest("hex");
  return { libraryId: String(lib), videoId, expire, signature, endpoint: "https://video.bunnycdn.com/tusupload" };
}
