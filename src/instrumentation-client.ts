import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) Sentry.init({
  dsn, tracesSampleRate: 0.1, enabled: process.env.NODE_ENV === "production",
  // Lọc nhiễu từ TIỆN ÍCH TRÌNH DUYỆT / script bên thứ ba (không phải lỗi app)
  ignoreErrors: [
    /zalo/i, /zaloJSV2/, /@context.*toLowerCase/i,        // extension Zalo + parser structured-data
    /Can't find variable: (zalo|fbq|ttq|gtag|webkit)/i,
    "ResizeObserver loop", /chrome-extension:\/\//, /moz-extension:\/\//, /safari-extension/i,
    "Non-Error promise rejection captured", /Load failed/, "Failed to fetch",
  ],
  denyUrls: [/extensions\//i, /^chrome:\/\//, /chrome-extension:\/\//, /moz-extension:\/\//, /safari-web-extension:\/\//, /<anonymous>/],
  beforeSend(event) {
    // Bỏ qua lỗi global onerror không có stack rõ ràng (thường do script ngoài chèn vào)
    const v = event.exception?.values?.[0];
    const frames = v?.stacktrace?.frames || [];
    const onlyGlobal = frames.length > 0 && frames.every((f) => !f.filename || /^app:\/\/\/?(:\d|dashboard|community)?$/.test(f.filename || ""));
    const msg = v?.value || "";
    if (/zalo|@context|extension/i.test(msg) && onlyGlobal) return null;
    return event;
  },
});

// Theo dõi điều hướng client (App Router)
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
