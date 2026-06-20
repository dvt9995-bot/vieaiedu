import { NextResponse } from "next/server";
import { validateCoupon } from "@/lib/coupon";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export async function POST(req: Request) {
  if (!rateLimit(`coupon:${clientIp(req)}`, 20, 60_000))
    return NextResponse.json({ valid: false, error: "Thử lại sau." }, { status: 429 });
  const { code } = await req.json().catch(() => ({ code: "" }));
  const percentOff = await validateCoupon(code);
  return NextResponse.json({ valid: percentOff > 0, percentOff });
}
