import "./globals.css";

import type React from "react";
import type { Metadata } from "next";
import { Inter, MedievalSharp } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import Link from "next/link";
// Zustand stores are used for state management, no need for context providers

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const medievalSharp = MedievalSharp({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-medieval",
});

export const metadata: Metadata = {
  title: "Turup's Gambit - Fantasy Card Game",
  description: "Turup's Gambit card game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${medievalSharp.variable} font-sans bg-background min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex flex-col min-h-screen w-full">
            <Navbar />
            <main className="flex-1 h-[80vh] w-full mx-auto">{children}</main>
            <footer className="text-center text-sm text-foreground/60 mt-auto mb-4 z-10">
              <div className="container mx-auto px-4">
                <p className="mb-2">© {2025} Turup's Gambit Fantasy Edition</p>
                <div className="flex justify-center gap-6">
                  <Link
                    href="/privacy-policy"
                    className="hover:text-primary transition-colors"
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    href="/about"
                    className="hover:text-primary transition-colors"
                  >
                    About
                  </Link>
                  <Link
                    href="/game"
                    className="hover:text-primary transition-colors"
                  >
                    Play Game
                  </Link>
                </div>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
