import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

const UNAUTHENTICATED_PATHS = [
  "/api/sms/incoming",
  "/api/whatsapp/incoming",
  "/api/cron/run-check-ins",
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (UNAUTHENTICATED_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  const authResponse = await auth0.middleware(request);
  if (authResponse.status !== 200) return authResponse;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  authResponse.headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
