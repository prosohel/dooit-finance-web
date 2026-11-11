import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * NextAuth route-protection middleware.
 *
 * Runs on the Edge before a matched request reaches a page or layout.
 * Sessions are read from the encrypted JWT cookie; unauthenticated users
 * hitting private routes are redirected to the login page.
 */

// ---------------------------------------------------------------------------
// Route definitions — adjust these lists as the app grows.
// ---------------------------------------------------------------------------

/** Routes that are always accessible without a session. */
const PUBLIC_ROUTE_PREFIXES = [
  "/auth", // login, register, OTP, password reset, etc.
  "/sso", // AFC OS handoff landing (the ticket in the URL is the credential)
  "/accept-invite", // token-based invite acceptance flow
];

const EXCLUDED_PUBLIC_ROUTES = ["/auth/registration-type"];

/** Routes that require a valid NextAuth session. */
const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard", // admin / client dashboards
  "/customer", // customer dashboard, registration, onboarding
  "/form", // KYC and entity onboarding forms
  "/auth/registration-type",
];

/** Returns true when `pathname` matches a prefix (exact or nested). */
function matchesPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isPublicRoute(pathname) {
  return PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => matchesPrefix(pathname, prefix) && !EXCLUDED_PUBLIC_ROUTES.includes(pathname),
  );
}

function isProtectedRoute(pathname) {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

// ---------------------------------------------------------------------------
// Middleware handler — wrapped by NextAuth so `req.auth` holds the session.
// ---------------------------------------------------------------------------

export default auth((req) => {
  const { nextUrl } = req;
  const { pathname } = nextUrl;
  const isLoggedIn = !!req.auth;

  // 1. Public routes — no session required.
  if (isPublicRoute(pathname)) {
    // Already signed in? Skip the login screen and go home.
    if (isLoggedIn && matchesPrefix(pathname, "/auth/login")) {
      return NextResponse.redirect(new URL("/", nextUrl.origin));
    }
    return NextResponse.next();
  }

  // 2. Protected route prefixes — redirect to login when there is no session.
  if (isProtectedRoute(pathname) && !isLoggedIn) {
    const loginUrl = new URL("/auth/login", nextUrl.origin);
    // Preserve the intended destination so the user lands here after sign-in.
    loginUrl.searchParams.set("callbackUrl", `${pathname}${nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Root path — mirror app/page.js: send anonymous visitors to login.
  if (pathname === "/" && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/login", nextUrl.origin));
  }

  return NextResponse.next();
});

// ---------------------------------------------------------------------------
// Matcher — limit which requests run through this middleware.
// Static assets and most API routes are excluded for performance.
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /api/*          (API routes handle their own auth via auth())
     * - /_next/static   (compiled JS/CSS)
     * - /_next/image    (image optimisation)
     * - favicon.ico and common static file extensions in /public
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
