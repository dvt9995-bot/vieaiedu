import { NextResponse } from "next/server";
import { getShopCategories } from "@/lib/shop";

export async function GET() {
  return NextResponse.json({ categories: await getShopCategories() });
}
