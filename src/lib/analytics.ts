// Gửi sự kiện tới Google Analytics (gtag) + Facebook Pixel (fbq) + TikTok (ttq) nếu đã cấu hình.
type Gtag = (cmd: string, event: string, params?: Record<string, unknown>) => void;
type Fbq = (cmd: string, event: string, params?: Record<string, unknown>) => void;
type Ttq = { track: (event: string, params?: Record<string, unknown>) => void };

// GA4 event -> Facebook standard event (sự kiện không có trong bảng sẽ dùng trackCustom)
const FB_MAP: Record<string, string> = {
  view_item: "ViewContent", add_to_wishlist: "AddToWishlist", begin_checkout: "InitiateCheckout",
  purchase: "Purchase", search: "Search", sign_up: "CompleteRegistration",
  newsletter_signup: "Lead", generate_lead: "Lead",
};
// GA4 event -> TikTok event
const TT_MAP: Record<string, string> = {
  view_item: "ViewContent", add_to_wishlist: "AddToWishlist", begin_checkout: "InitiateCheckout",
  purchase: "CompletePayment", search: "Search", sign_up: "CompleteRegistration",
  newsletter_signup: "Subscribe", generate_lead: "SubmitForm",
};

function fbParams(p: Record<string, unknown> = {}) {
  const out: Record<string, unknown> = {};
  if (p.value != null) out.value = p.value;
  if (p.currency) out.currency = p.currency;
  if (p.item_id) out.content_ids = [p.item_id];
  if (p.item_name) out.content_name = p.item_name;
  if (p.search_term) out.search_string = p.search_term;
  return out;
}

export function track(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: Gtag; fbq?: Fbq; ttq?: Ttq };
  // Google Analytics
  try { w.gtag?.("event", event, params); } catch {}
  // Facebook Pixel
  try {
    if (w.fbq) {
      const fb = FB_MAP[event];
      if (fb) w.fbq("track", fb, fbParams(params));
      else w.fbq("trackCustom", event, params);
    }
  } catch {}
  // TikTok Pixel
  try {
    if (w.ttq) {
      const tt = TT_MAP[event];
      w.ttq.track(tt || event, fbParams(params));
    }
  } catch {}
  // First-party (Marketing Dashboard của app)
  try {
    import("@/lib/session").then(({ anonId, sessionId }) => {
      fetch("/api/event", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ event, path: location.pathname, anon: anonId(), sid: sessionId(), props: params }) }).catch(() => {});
    }).catch(() => {});
  } catch {}
}
