/**
 * OfflineBanner Component
 *
 * Displays a notification banner when the user loses internet connection.
 * Automatically hides when connection is restored.
 *
 * Features:
 * - Glassmorphism design with backdrop blur
 * - Smooth slide-down animation using Framer Motion
 * - Auto-hide when connection is restored
 * - Responsive layout that works on mobile and desktop
 * - Shows helpful message about syncing when back online
 */

"use client";

import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check initial state
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed top-0 left-0 right-0 z-50 p-4"
      >
        <div className="glass-dark rounded-xl shadow-lg overflow-hidden">
          <div className="flex items-center justify-center gap-3 p-3">
            <WifiOff className="w-5 h-5 text-white/80" />
            <span className="text-white font-medium text-sm">
              You're offline
            </span>
            <span className="text-white/60 text-sm hidden sm:inline">
              Changes will sync when you're back online
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
