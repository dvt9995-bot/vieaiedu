// Rate limit nhẹ (in-memory, theo IP) — best-effort chống spam/burst.
// Lưu ý: trên serverless, bộ nhớ theo từng instance nên không tuyệt đối;
// để chính xác toàn cục nên dùng Upstash Ratelimit (Redis). Đủ tốt cho lạm dụng cơ bản.
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) { buckets.set(key, { count: 1, reset: now + windowMs }); return true; }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}
