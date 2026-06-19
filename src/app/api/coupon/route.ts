import { NextResponse } from "next/server";
import { validateCoupon } from "@/lib/coupon";

export async function POST(req: Request) {
  const { code } = await req.json().catch(() => ({ code: "" }));
  const percentOff = await validateCoupon(code);
  return NextResponse.json({ valid: percentOff > 0, percentOff });
}
