// Các hãng vận chuyển phổ biến VN + link tra cứu vận đơn theo mã.
export const CARRIERS: { id: string; name: string; track: (code: string) => string }[] = [
  { id: "ghn", name: "Giao Hàng Nhanh (GHN)", track: (c) => `https://donhang.ghn.vn/?order_code=${encodeURIComponent(c)}` },
  { id: "ghtk", name: "Giao Hàng Tiết Kiệm (GHTK)", track: (c) => `https://i.ghtk.vn/${encodeURIComponent(c)}` },
  { id: "vtp", name: "ViettelPost", track: (c) => `https://viettelpost.com.vn/tra-cuu-hanh-trinh-don/?peopleTracking=${encodeURIComponent(c)}` },
  { id: "jt", name: "J&T Express", track: (c) => `https://jtexpress.vn/vi/tracking?type=track&billcode=${encodeURIComponent(c)}` },
  { id: "spx", name: "SPX (Shopee Express)", track: (c) => `https://spx.vn/track?${encodeURIComponent(c)}` },
  { id: "vnpost", name: "VNPost (EMS)", track: (c) => `https://www.vnpost.vn/tra-cuu-buu-pham?key=${encodeURIComponent(c)}` },
  { id: "other", name: "Khác", track: () => "" },
];

export function carrierName(id?: string | null) { return CARRIERS.find((c) => c.id === id)?.name || id || ""; }
export function trackingUrl(carrier?: string | null, code?: string | null) {
  if (!code) return "";
  const c = CARRIERS.find((x) => x.id === carrier);
  return c ? c.track(code) : "";
}
