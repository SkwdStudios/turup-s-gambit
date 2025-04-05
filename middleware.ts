import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
// import { auth } from "@/auth"; // Remove auth import

// Change to a standard middleware function
export function middleware(req: NextRequest) {
  // Handle WebSocket upgrade requests
  if (req.headers.get("upgrade") === "websocket") {
    // Allow WebSocket connections to pass through
    return NextResponse.next();
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
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
