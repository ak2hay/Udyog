import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_PATHS = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/superadmin/login",
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const isPublic =
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/reset-password/");

  const sessionCookie = getSessionCookie(request);
  const isSuperAdminPath = pathname.startsWith("/superadmin");

  if (!sessionCookie && !isPublic && pathname !== "/") {
    const login = new URL(isSuperAdminPath ? "/superadmin/login" : "/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (sessionCookie && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (sessionCookie && pathname === "/superadmin/login") {
    return NextResponse.redirect(new URL("/superadmin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
