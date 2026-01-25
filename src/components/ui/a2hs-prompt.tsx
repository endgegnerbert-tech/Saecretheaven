/**
 * A2HSPrompt Component
 *
 * Add to Home Screen prompt for Progressive Web App installation.
 * Detects when the app can be installed and shows a user-friendly prompt.
 *
 * Features:
 * - Detects PWA installation capability using beforeinstallprompt event
 * - Shows prompt after a delay to not be intrusive
 * - Glassmorphism design with backdrop blur
 * - Smooth animations using Framer Motion
 * - Remembers user choice in localStorage to avoid repeated prompts
 * - Responsive layout that works on mobile and desktop
 */

"use client";

import { useState, useEffect } from "react";
import { Smartphone, X, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function A2HSPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    const dismissedBefore = localStorage.getItem("a2hs-dismissed");
    if (dismissedBefore) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Show prompt after a delay to not be intrusive
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000);

      return () => clearTimeout(timer);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    (deferredPrompt as any).prompt();

    // Wait for user choice
    const { outcome } = await (deferredPrompt as any).userChoice;

    if (outcome === "accepted") {
      console.log("User accepted PWA installation");
    } else {
      console.log("User dismissed PWA installation");
    }

    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("a2hs-dismissed", "true");
  };

  if (!showPrompt || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto"
      >
        <div className="glass-dark rounded-xl shadow-lg overflow-hidden border border-white/10">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 pt-1">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>

              <div className="flex-1">
                <h4 className="font-semibold text-white mb-1">
                  Install PhotoVault
                </h4>
                <p className="text-sm text-white/80">
                  Get the full app experience with offline access and faster
                  performance.
                </p>
              </div>

              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 rounded-full hover:bg-black/20 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="flex-1 ios-button-primary flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add to Home Screen
              </button>

              <button
                onClick={handleDismiss}
                className="flex-shrink-0 ios-button-secondary py-2 px-4 rounded-lg text-sm font-medium"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
