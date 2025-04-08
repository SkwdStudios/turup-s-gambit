"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Info, LogIn, LogOut, Menu, X, Music } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LoginModal } from "@/components/login-modal";
import { useAuth } from "@/hooks/use-auth";
import { MusicControls } from "@/components/music-controls";
import Image from "next/image";
import { motion } from "framer-motion";

export function Navbar() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showMusicControls, setShowMusicControls] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  // Remove debug logging
  // useEffect(() => {
  //   console.log("Auth status:", { isAuthenticated, user });
  // }, [isAuthenticated, user]);

  const handleNavigation = useCallback(
    (path: string) => {
      if (!user && (path === "/profile" || path === "/game")) {
        setShowLoginModal(true);
        return;
      }
      router.push(path);
    },
    [user, router]
  );

  const handleLogout = useCallback(() => {
    logout();
    if (pathname === "/profile" || pathname === "/game") {
      router.push("/");
    }
  }, [logout, pathname, router]);

  // Memoize user display info to prevent unnecessary recalculations
  const userDisplayInfo = useMemo(() => {
    return {
      displayName: user?.discordUsername || user?.username || "User",
      avatarUrl: user?.discordAvatar || user?.avatar || "/default-avatar.png",
    };
  }, [user]);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-primary/20 bg-card/80 backdrop-blur-md"
      >
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center"
            >
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/logo.svg"
                  alt="Turup's Gambit Logo"
                  width={48}
                  height={48}
                  className="[&>path]:fill-primary"
                />
                <span className="text-2xl font-medieval text-primary">
                  Turup's Gambit
                </span>
              </Link>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  variant="link"
                  size="sm"
                  className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
                  onClick={() => handleNavigation("/about")}
                >
                  <Info
                    size={18}
                    className="transition-transform duration-300 hover:scale-110"
                  />
                  <span>About</span>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Button
                  variant="link"
                  size="sm"
                  className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
                  onClick={() => setShowMusicControls(!showMusicControls)}
                >
                  <Music
                    size={18}
                    className="transition-transform duration-300 hover:scale-110"
                  />
                  <span>Music</span>
                </Button>
              </motion.div>

              {user ? (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-4"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => handleNavigation("/profile")}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={userDisplayInfo.avatarUrl}
                        alt={userDisplayInfo.displayName}
                      />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {userDisplayInfo.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden lg:inline">
                      {userDisplayInfo.displayName}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 medieval-button"
                    onClick={handleLogout}
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button
                    variant="default"
                    size="sm"
                    className="flex items-center gap-2 medieval-button bg-primary text-primary-foreground"
                    onClick={() => setShowLoginModal(true)}
                  >
                    <LogIn size={18} />
                    <span>Login</span>
                  </Button>
                </motion.div>
              )}
            </nav>

            {/* Mobile Navigation */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu size={24} />
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-card/95 backdrop-blur-md border-primary/20 p-6">
                <motion.div
                  className="flex flex-col gap-6 mt-8"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Button
                    variant="link"
                    className="flex items-center justify-start gap-2 text-foreground hover:text-primary transition-colors"
                    onClick={() => handleNavigation("/about")}
                  >
                    <Info
                      size={18}
                      className="transition-transform duration-300 hover:scale-110"
                    />
                    <span>About</span>
                  </Button>
                  <Button
                    variant="link"
                    className="flex items-center justify-start gap-2 text-foreground hover:text-primary transition-colors"
                    onClick={() => setShowMusicControls(!showMusicControls)}
                  >
                    <Music
                      size={18}
                      className="transition-transform duration-300 hover:scale-110"
                    />
                    <span>Music</span>
                  </Button>

                  {user ? (
                    <>
                      <Button
                        variant="ghost"
                        className="flex items-center justify-start gap-2"
                        onClick={() => handleNavigation("/profile")}
                      >
                        <User size={18} />
                        <span>Profile</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex items-center justify-start gap-2 medieval-button"
                        onClick={handleLogout}
                      >
                        <LogOut size={18} />
                        <span>Logout</span>
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="default"
                      className="flex items-center justify-start gap-2 medieval-button bg-primary text-primary-foreground"
                      onClick={() => setShowLoginModal(true)}
                    >
                      <LogIn size={18} />
                      <span>Login</span>
                    </Button>
                  )}
                </motion.div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </motion.header>

      {/* Music Controls Popup */}
      {showMusicControls && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 right-4 z-50 p-4 rounded-lg bg-card/90 backdrop-blur-md border border-primary/20 shadow-xl"
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medieval text-primary">Music Controls</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMusicControls(false)}
            >
              <X size={18} />
            </Button>
          </div>
          <MusicControls />
        </motion.div>
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </>
  );
}
