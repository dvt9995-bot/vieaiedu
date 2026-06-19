import crypto from "crypto";

// Bunny Stream — sinh URL nhúng có token chống tải trộm (token authentication).
// Cấu hình: bật "Token Authentication" trong Bunny Stream library, lấy security key.
const LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID;
const SECURITY_KEY = process.env.BUNNY_STREAM_TOKEN_KEY; // "Token Authentication Key" của library

export const isBunnyConfigured = () => !!LIBRARY_ID;

/** URL iframe nhúng video (có token + hạn dùng nếu đã cấu hình security key). */
export function bunnyEmbedUrl(videoId: string, expiresInSec = 3 * 3600): string {
  if (!LIBRARY_ID) return "";
  const base = `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${videoId}`;
  if (!SECURITY_KEY) return base; // chưa bật token auth
  const expires = Math.floor(Date.now() / 1000) + expiresInSec;
  const path = `/embed/${LIBRARY_ID}/${videoId}`;
  const token = crypto.createHash("sha256").update(SECURITY_KEY + path + expires).digest("hex");
  return `${base}?token=${token}&expires=${expires}`;
}
