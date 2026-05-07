import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale } from "@/lib/i18n";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if there is any supported locale in the pathname
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  // Redirect if there is no locale
  const locale = defaultLocale;
  request.nextUrl.pathname = `/${locale}${pathname}`;
  
  // Special case for root: redirect to /en/docs/overview/introduction
  if (pathname === "/") {
    request.nextUrl.pathname = `/${locale}/docs/overview/introduction`;
  }

  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    // Skip all internal paths (_next, api, static, etc)
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
