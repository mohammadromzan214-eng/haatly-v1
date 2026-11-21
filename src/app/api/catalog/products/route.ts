import { NextRequest, NextResponse } from "next/server";
import { getStorefrontProductsByIds } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rawIds = request.nextUrl.searchParams.get("ids") ?? "";
  const ids = [...new Set(rawIds.split(",").filter(Boolean))];
  if (ids.length > 100 || ids.some((id) => id.length > 128)) {
    return NextResponse.json({ error: "Invalid product list." }, { status: 400 });
  }
  try {
    const products = await getStorefrontProductsByIds(ids);
    return NextResponse.json({ products }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not read public product data.", error);
    return NextResponse.json({ error: "Product data is temporarily unavailable." }, { status: 503 });
  }
}
