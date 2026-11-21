import { NextRequest, NextResponse } from "next/server";
import { getCustomerSessionCookieName } from "@/lib/customer-auth";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getCustomerSessionCookieName(), "", {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
