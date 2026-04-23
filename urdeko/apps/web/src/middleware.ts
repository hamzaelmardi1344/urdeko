import { NextResponse, type NextRequest } from "next/server";

const GUEST_COOKIE = "urdeko_guest";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Parcours projet : pas de cache navigateur sur le document HTML — évite
  // les POST RSC avec d’anciennes Server Actions après un restart / rebuild.
  const path = request.nextUrl.pathname;
  if (path.startsWith("/projets")) {
    response.headers.set(
      "Cache-Control",
      "private, no-cache, no-store, max-age=0, must-revalidate",
    );
  }

  if (!request.cookies.get(GUEST_COOKIE)) {
    // `crypto.randomUUID()` est disponible globalement dans le runtime Edge.
    response.cookies.set(GUEST_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next|api/media|favicon|icons|manifest|service-worker|workbox).*)"],
};
