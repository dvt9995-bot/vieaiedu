import { getConfig } from "@/lib/settings";

// Tích hợp Giao Hàng Nhanh (GHN). CẦN cấu hình trong Admin Settings:
//  - ghn_token: API token (Shop > Cài đặt > API Token trên ghn.vn)
//  - ghn_shop_id: ShopID GHN của bạn
// LƯU Ý: để TÍNH PHÍ + TẠO VẬN ĐƠN tự động cần địa chỉ người nhận dạng MÃ Tỉnh/Huyện/Xã của GHN
// (hiện app thu địa chỉ dạng text tự do — cần nâng cấp form địa chỉ chọn Tỉnh/Huyện/Xã trước).

const BASE = "https://online-gateway.ghn.vn/shiip/public-api";

export async function ghnConfigured(): Promise<boolean> {
  return !!(await getConfig("ghn_token")) && !!(await getConfig("ghn_shop_id"));
}

async function ghnFetch(path: string, body: unknown) {
  const token = await getConfig("ghn_token");
  const shopId = await getConfig("ghn_shop_id");
  if (!token) return null;
  try {
    const r = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Token: token, ...(shopId ? { ShopId: shopId } : {}) },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

// Tính phí ship. to = {district_id, ward_code}; weight (gram). Trả số tiền hoặc null.
export async function ghnCalcFee(input: { to_district_id: number; to_ward_code: string; weight: number; service_type_id?: number }): Promise<number | null> {
  const j = await ghnFetch("/v2/shipping-order/fee", {
    service_type_id: input.service_type_id || 2,
    to_district_id: input.to_district_id, to_ward_code: input.to_ward_code,
    weight: Math.max(50, input.weight || 500), length: 20, width: 20, height: 10,
  });
  return j?.data?.total ?? null;
}

// Tạo vận đơn. Trả mã vận đơn (order_code) hoặc null.
export async function ghnCreateOrder(input: Record<string, unknown>): Promise<string | null> {
  const j = await ghnFetch("/v2/shipping-order/create", input);
  return j?.data?.order_code ?? null;
}
