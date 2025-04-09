import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Get the pathname of the request
  const path = req.nextUrl.pathname;

  // Handle WebSocket upgrade requests
  if (req.headers.get("upgrade") === "websocket") {
    // Allow WebSocket connections to pass through
    return NextResponse.next();
  }

  // Handle WebSocket API requests for the old implementation
  if (path === "/api/socket" && req.method === "GET") {
    // Redirect to the new Realtime API
    return NextResponse.redirect(new URL("/api/realtime", req.url));
  }

  // Continue processing all other requests
  return NextResponse.next();
}

// Configure the middleware to match all request paths
// except for those starting with api, _next/static, _next/image, and favicon.ico
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - realtime (Supabase Realtime)
     */
    "/((?!_next/static|_next/image|favicon.ico|realtime).*)",
    "/api/:path*",
  ],
};
