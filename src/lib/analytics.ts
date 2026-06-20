// Gửi sự kiện tới Google Analytics (gtag) nếu đã cấu hình. An toàn nếu chưa có GA.
type Gtag = (cmd: string, event: string, params?: Record<string, unknown>) => void;

export function track(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const g = (window as unknown as { gtag?: Gtag }).gtag;
  if (g) g("event", event, params || {});
}
