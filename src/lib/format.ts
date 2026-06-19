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
