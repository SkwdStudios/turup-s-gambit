"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, LogOut, User, Settings } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { LoginModal } from "@/components/login-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";

export function AuthButton() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useSupabaseAuth();

  // Debug logging
  console.log("[AuthButton] User:", user);
  console.log("[AuthButton] isAuthenticated:", isAuthenticated);

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

  // User display info
  const userDisplayInfo = {
    displayName:
      user?.discordUsername || user?.username || user?.name || "User",
    avatarUrl:
      user?.discordAvatar ||
      user?.avatar ||
      user?.image ||
      "/default-avatar.png",
  };

  if (isAuthenticated && user) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 hover:bg-primary/10"
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
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-card/95 backdrop-blur-md border-primary/20"
            >
              <DropdownMenuLabel className="font-medieval text-primary">
                My Account
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer flex items-center gap-2"
                onClick={() => handleNavigation("/profile")}
              >
                <User size={16} />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer flex items-center gap-2"
                onClick={() => handleNavigation("/game")}
              >
                <Settings size={16} />
                <span>Game Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer flex items-center gap-2 text-destructive"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>

        {/* Login Modal */}
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      </>
    );
  }

  return (
    <>
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

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </>
  );
}
