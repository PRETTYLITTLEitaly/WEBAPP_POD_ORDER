import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Escludiamo file statici e rotta pubblica di generazione PDF
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/pdf") ||
    pathname.startsWith("/fonts") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("admin_session");

  let isAuthenticated = false;
  if (sessionCookie && sessionCookie.value) {
    if (sessionCookie.value === "authenticated") {
      isAuthenticated = true;
    } else {
      try {
        const parsed = JSON.parse(sessionCookie.value);
        if (parsed && (parsed.email || parsed.role)) {
          isAuthenticated = true;
        }
      } catch (e) {
        if (sessionCookie.value.length > 0) {
          isAuthenticated = true;
        }
      }
    }
  }

  // Se l'utente è sulla pagina di login ed è già autenticato, lo reindirizziamo all'app
  if (pathname === "/admin/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/orders/b2b", request.url));
    }
    return NextResponse.next();
  }

  // Se non è autenticato e cerca di accedere a qualsiasi rotta dell'app, reindirizziamo al Login
  if (!isAuthenticated) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Protegge tutte le pagine dell'applicazione tranne asset statici, font ed API pubbliche
     */
    "/((?!_next/static|_next/image|favicon.ico|api/pdf|fonts).*)",
  ],
};
