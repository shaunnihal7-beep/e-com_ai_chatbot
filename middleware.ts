import { NextResponse, type NextRequest } from "next/server";

/**
 * Guards the account area and the CMS.
 *
 * Only checks that a session cookie is present — signatures are verified on the
 * server (lib/auth.ts, lib/admin/auth.ts), because middleware runs on the edge
 * runtime where node:crypto isn't available. A forged cookie gets past
 * middleware and is then rejected by `getSession()` / `requireAdmin()`, which
 * every protected page calls. Middleware is a redirect convenience, never the
 * security boundary.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    // The login page itself must stay reachable without a session.
    if (pathname === "/admin/login") return NextResponse.next();

    if (!request.cookies.get("veloce_admin")?.value) {
      const url = new URL("/admin/login", request.url);
      url.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  if (!request.cookies.get("veloce_session")?.value) {
    const url = new URL("/account/login", request.url);
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Checkout is intentionally NOT matched — guests can check out.
  matcher: ["/account", "/account/orders/:path*", "/admin/:path*"],
};
