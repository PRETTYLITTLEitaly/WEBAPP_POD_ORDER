import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Proteggiamo solo le route che iniziano con /admin
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Escludiamo la pagina di login stessa
    if (request.nextUrl.pathname === "/admin/login") {
      return NextResponse.next();
    }

    const sessionCookie = request.cookies.get("admin_session");

    // Se il cookie non esiste o non è valido, reindirizza al login
    if (!sessionCookie || sessionCookie.value !== "authenticated") {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
