import { NextRequest, NextResponse } from "next/server";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-auth";
import { getCustomerWishlist, setCustomerWishlistItem } from "@/lib/db/customer-repository";

async function getUserId(request: NextRequest) {
  return (await verifyCustomerSession(request.cookies.get(getCustomerSessionCookieName())?.value))?.id ?? null;
}

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return NextResponse.json({ wishlist: await getCustomerWishlist(userId) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not load customer wishlist.", error);
    return NextResponse.json({ error: "Could not load wishlist." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let body: { productId?: unknown };
  try {
    body = JSON.parse(await request.text()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof body.productId !== "string" || !body.productId) return NextResponse.json({ error: "Product id is required." }, { status: 400 });
  try {
    return NextResponse.json({ wishlist: await setCustomerWishlistItem(userId, body.productId, true) });
  } catch (error) {
    console.error("Could not save wishlist item.", error);
    return NextResponse.json({ error: "Could not save wishlist item." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const productId = request.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "Product id is required." }, { status: 400 });
  try {
    return NextResponse.json({ wishlist: await setCustomerWishlistItem(userId, productId, false) });
  } catch (error) {
    console.error("Could not remove wishlist item.", error);
    return NextResponse.json({ error: "Could not remove wishlist item." }, { status: 500 });
  }
}
