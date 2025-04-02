import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Handle WebSocket upgrade requests
  if (request.headers.get("upgrade") === "websocket") {
    return NextResponse.next();
  }

  return NextResponse.next();
}

// Comment out the config to prevent middleware from running on the socket path
// export const config = {
//   matcher: "/api/socket/io/:path*",
// };
