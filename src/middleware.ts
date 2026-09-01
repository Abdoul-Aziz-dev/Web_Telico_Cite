import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_ROUTES = ["/dashboard", "/clients", "/chambres", "/contrats", "/paiements", "/retards", "/depenses", "/clotures", "/contacts", "/utilisateurs", "/audit", "/parametres", "/recherche", "/assistant"];
const VISITOR_ROUTES = ["/visiteur"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("user_session");

  let user: { role: string } | null = null;
  if (sessionCookie) {
    try {
      user = JSON.parse(sessionCookie.value);
    } catch {
      user = null;
    }
  }

  const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
  const isVisitorRoute = VISITOR_ROUTES.some((r) => pathname.startsWith(r));
  const isLoginPage = pathname === "/login";

  // Rediriger vers login si non connecté sur route protégée
  if ((isAdminRoute || isVisitorRoute) && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Rediriger vers login si rôle insuffisant
  if (isAdminRoute && user?.role !== "gerant") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isVisitorRoute && user?.role !== "visiteur") {
    if (user?.role === "gerant") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Si déjà connecté et va sur /login, rediriger vers le bon espace
  if (isLoginPage && user) {
    if (user.role === "gerant") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/visiteur", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/clients/:path*", "/chambres/:path*", "/contrats/:path*", "/paiements/:path*", "/retards/:path*", "/depenses/:path*", "/clotures/:path*", "/contacts/:path*", "/utilisateurs/:path*", "/audit/:path*", "/parametres/:path*", "/recherche/:path*", "/assistant/:path*", "/visiteur/:path*", "/login"],
};
