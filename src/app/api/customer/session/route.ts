import { NextRequest, NextResponse } from "next/server";
import { getCustomerSessionCookieName } from "@/lib/customer-auth";
import { customerSessionUnavailableResponse, verifyActiveCustomerRequest } from "@/lib/customer-access";

export async function GET(request: NextRequest) {
  const check = await verifyActiveCustomerRequest(request);
  if (check.status === "unavailable") return customerSessionUnavailableResponse();
  const response = NextResponse.json({
    customer: check.status === "authenticated" ? check.customer : null,
  }, { headers: { "Cache-Control": "no-store" } });
  if (check.status === "unauthenticated" && request.cookies.has(getCustomerSessionCookieName())) {
    response.cookies.set(getCustomerSessionCookieName(), "", {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}
