import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const AUTH_COOKIE = "better-auth.session_token";
const SECURE_AUTH_COOKIE = "__Secure-better-auth.session_token";

const PUBLIC_PATHS = new Set(["/login", "/register"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionToken = request.cookies.get(AUTH_COOKIE) ?? request.cookies.get(SECURE_AUTH_COOKIE);

  const isPublic = PUBLIC_PATHS.has(pathname);

  if (sessionToken && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!sessionToken && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
