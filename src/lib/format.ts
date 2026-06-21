export function formatVND(amount: number): string {
  if (amount === 0) return "Miễn phí";
  return amount.toLocaleString("vi-VN") + "đ";
}

export function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} phút`;
  return m === 0 ? `${h} giờ` : `${h}g ${m}p`;
}

export function formatCount(n: number): string {
  return n.toLocaleString("vi-VN");
}

// Định dạng ngày/giờ theo MÚI GIỜ VIỆT NAM (tránh lệch ngày khi render trên server UTC)
const TZ = "Asia/Ho_Chi_Minh";
export function formatDate(d: string | number | Date): string {
  return new Date(d).toLocaleDateString("vi-VN", { timeZone: TZ });
}
export function formatDateTime(d: string | number | Date): string {
  return new Date(d).toLocaleString("vi-VN", { timeZone: TZ, hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}
