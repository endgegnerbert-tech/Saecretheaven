"use client";

import { useCallback } from "react";

/**
 * useBurnerCleanup Hook
 * 
 * Aggressively wipes session data and redirects the user to leave no trace.
 * Useful for "Panic Buttons" or post-upload cleanup.
 */
export function useBurnerCleanup() {
    const wipeAndExit = useCallback(() => {
        // 1. Clear Storage
        if (typeof window !== "undefined") {
            try {
                localStorage.clear();
                sessionStorage.clear();

                // Clear cookies (simple implementation)
                document.cookie.split(";").forEach((c) => {
                    document.cookie = c
                        .replace(/^ +/, "")
                        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });
            } catch (e) {
                console.error("Cleanup error:", e);
            }

            // 2. Overwrite History (Flooding)
            // Push dummy state to bury the previous page
            try {
                window.history.pushState(null, "", window.location.href);
                window.history.replaceState(null, "", "/");
            } catch (e) {
                // Ignore
            }

            // 3. Redirect Aggressively
            // Use replace() to overwrite the current history entry
            // Redirect to a benign, fast-loading site
            window.location.replace("https://www.google.com");

            // Fallback if replace is blocked (unlikely)
            setTimeout(() => {
                window.location.href = "https://www.google.com";
            }, 100);
        }
    }, []);

    return { wipeAndExit };
}
