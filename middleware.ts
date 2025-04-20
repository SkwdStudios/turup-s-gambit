import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  // Get the pathname of the request
  const path = req.nextUrl.pathname;
  const res = NextResponse.next();

  // Create Supabase server client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => {
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove: (name, options) => {
          res.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  try {
    console.log("[Middleware] Getting authenticated user");
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.log("[Middleware] No authenticated user found");
    } else {
      console.log("[Middleware] User authenticated:", !!data.user);
      if (data.user) {
        console.log("[Middleware] User ID:", data.user.id);
      }
    }
  } catch (error) {
    console.error("[Middleware] Error getting authenticated user:", error);
  }

  // Handle WebSocket upgrade requests
  if (req.headers.get("upgrade") === "websocket") {
    // Allow WebSocket connections to pass through
    return res;
  }

  // Handle WebSocket API requests for the old implementation
  if (path === "/api/socket" && req.method === "GET") {
    // Redirect to the new Realtime API
    return NextResponse.redirect(new URL("/api/realtime", req.url));
  }

  // Continue processing all other requests
  return res;
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
