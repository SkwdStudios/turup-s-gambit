import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log("[Auth Callback] Processing OAuth callback");

  // Get the URL and create a response that redirects to the home page
  const requestUrl = new URL(request.url);
  const response = NextResponse.redirect(new URL("/", request.url));

  // Create a Supabase client using the request and response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove: (name, options) => {
          response.cookies.set({
            name,
            value: "",
            ...options,
            maxAge: 0,
          });
        },
      },
    }
  );

  // Get the code from the URL
  const code = requestUrl.searchParams.get("code");

  // If there's a code, exchange it for a session
  if (code) {
    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch (error) {
      console.error(
        "[Auth Callback] Error exchanging code for session:",
        error
      );
      // Continue with the redirect even if there's an error
    }
  }

  // Return the response with the session cookie set
  return response;
}
