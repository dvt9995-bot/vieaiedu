// Tích hợp SePay (sepay.vn) — thanh toán qua VietQR + đối soát tự động bằng webhook.
// Luồng: tạo order pending với mã nội dung duy nhất -> hiển thị QR -> user chuyển khoản
// -> SePay gọi webhook -> đối chiếu nội dung + số tiền -> đánh dấu paid + tạo enrollment.

const ACC = process.env.SEPAY_ACCOUNT;       // số tài khoản nhận
const BANK = process.env.SEPAY_BANK;          // mã ngân hàng (vd: VCB, TCB, MB...)

/** Mã nội dung chuyển khoản cho 1 đơn (chỉ chữ-số, dễ đối soát). */
export function orderCode(orderId: string) {
  return "VIE" + orderId.replace(/-/g, "").slice(0, 12).toUpperCase();
}

/** URL ảnh QR động của SePay (VietQR). */
export function sepayQrUrl(amount: number, code: string) {
  const acc = ACC ?? "0000000000";
  const bank = BANK ?? "MB";
  const params = new URLSearchParams({
    acc, bank, amount: String(amount), des: code, template: "compact",
  });
  return `https://qr.sepay.vn/img?${params.toString()}`;
}

export const isSepayConfigured = () => !!ACC && !!BANK;
