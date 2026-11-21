import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionCookieName, verifyAdminSession } from "@/lib/admin-auth";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/profile")) {
    const customer = await verifyCustomerSession(request.cookies.get(getCustomerSessionCookieName())?.value);
    if (!customer) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if ((pathname === "/login" || pathname === "/register" || pathname === "/forgot-password")) {
    const customer = await verifyCustomerSession(request.cookies.get(getCustomerSessionCookieName())?.value);
    if (customer) return NextResponse.redirect(new URL("/profile", request.url));
  }

  if (!pathname.startsWith("/admin")) return NextResponse.next();

  if (pathname === "/admin/login") {
    const authenticated = await verifyAdminSession(request.cookies.get(getAdminSessionCookieName())?.value);
    if (authenticated) {
      return NextResponse.redirect(new URL("/admin/inventory", request.url));
    }
    return NextResponse.next();
  }

  const authenticated = await verifyAdminSession(request.cookies.get(getAdminSessionCookieName())?.value);
  if (!authenticated) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/data",
    "/profile",
    "/profile/:path*",
    "/login",
    "/register",
    "/forgot-password",
  ],
};
