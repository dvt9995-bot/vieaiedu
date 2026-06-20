// SePay (VietQR + webhook). Cấu hình đọc từ app_settings (admin sửa) → fallback env.
import { getConfig } from "@/lib/settings";

export function orderCode(orderId: string) {
  return "VIE" + orderId.replace(/-/g, "").slice(0, 12).toUpperCase();
}

export async function sepayQrUrl(amount: number, code: string) {
  const acc = (await getConfig("sepay_account", "SEPAY_ACCOUNT")) || "0000000000";
  const bank = (await getConfig("sepay_bank", "SEPAY_BANK")) || "MB";
  const params = new URLSearchParams({ acc, bank, amount: String(amount), des: code, template: "compact" });
  return `https://qr.sepay.vn/img?${params.toString()}`;
}

export async function isSepayConfigured() {
  return !!(await getConfig("sepay_account", "SEPAY_ACCOUNT"));
}
