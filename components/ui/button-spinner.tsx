"use client";

import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion } from "framer-motion";

interface ButtonSpinnerProps {
  className?: string;
}

export function ButtonSpinner({ className }: ButtonSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <LoadingSpinner size="sm" className="mr-2" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        Loading...
      </motion.span>
    </div>
  );
}
