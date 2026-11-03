import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "./lib/session";

const ADMIN_ROUTES = ["/dashboard", "/clients", "/chambres", "/contrats", "/paiements", "/retards", "/depenses", "/clotures", "/contacts", "/utilisateurs", "/audit", "/parametres", "/recherche", "/assistant", "/test-sidebar"];
const VISITOR_ROUTES = ["/visiteur"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const user = await verifySessionToken(request.cookies.get("user_session")?.value);

  const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
  const isVisitorRoute = VISITOR_ROUTES.some((r) => pathname.startsWith(r));
  const isLoginPage = pathname === "/login";
  const isApiRoute = pathname.startsWith("/api/");

  if (isApiRoute) {
    const publicApi =
      pathname === "/api/auth/login" ||
      pathname === "/api/auth/register" ||
      pathname === "/api/auth/me" ||
      pathname === "/api/auth/logout" ||
      pathname === "/api/contact" && request.method === "POST" ||
      pathname === "/api/chambres" && request.method === "GET" ||
      pathname === "/api/health";
    if (publicApi) return NextResponse.next();
    if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    if (
      (pathname === "/api/auth/reserve" || pathname === "/api/auth/reservations") &&
      user.role === "visiteur"
    ) return NextResponse.next();
    if (user.role !== "gerant") {
      return NextResponse.json({ error: "Accès réservé à l'administration" }, { status: 403 });
    }
    return NextResponse.next();
  }

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
  matcher: ["/api/:path*", "/dashboard/:path*", "/clients/:path*", "/chambres/:path*", "/contrats/:path*", "/paiements/:path*", "/retards/:path*", "/depenses/:path*", "/clotures/:path*", "/contacts/:path*", "/utilisateurs/:path*", "/audit/:path*", "/parametres/:path*", "/recherche/:path*", "/assistant/:path*", "/test-sidebar/:path*", "/visiteur/:path*", "/login"],
};
