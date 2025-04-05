"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

export function TempSessionCheck() {
  const { data: session, status } = useSession();

  useEffect(() => {
    console.log(
      `[TempSessionCheck] Status: ${status}, Session: ${JSON.stringify(
        session
      )}`
    );
  }, [status, session]);

  return null; // This component doesn't render anything visual
}
