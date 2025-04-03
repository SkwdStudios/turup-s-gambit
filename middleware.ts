import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  // Handle WebSocket upgrade requests
  if (req.headers.get("upgrade") === "websocket") {
    // Allow WebSocket connections to pass through
    return NextResponse.next();
  }

  // Continue processing all other requests
  return NextResponse.next();
});

// Configure the middleware to match all request paths
// except for those starting with api, _next/static, _next/image, and favicon.ico
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
