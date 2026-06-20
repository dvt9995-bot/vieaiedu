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
