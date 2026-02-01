"use client";

import { useEffect, useState } from "react";

interface StealthShieldProps {
  children: React.ReactNode;
}

export function StealthShield({ children }: StealthShieldProps) {
  const [isFocused, setIsFocused] = useState(true);

  // 1. Tab Disguise (Title & Favicon)
  useEffect(() => {
    const originalTitle = document.title;
    
    // Change immediately
    document.title = "Google Search";
    
    // Create/Update favicon
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    // Transparent pixel or google favicon
    link.href = 'https://www.google.com/favicon.ico';
    document.getElementsByTagName('head')[0].appendChild(link);

    // Re-apply aggressively on visibility change
    const handleVisibility = () => {
        if (document.hidden) {
            document.title = "Google Search";
        } else {
            // Restore? No, keep it disguised.
            document.title = "Google Search";
        }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.title = originalTitle;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // 2. Focus Guard (Anti-Screenshot / Anti-Multitasking)
  useEffect(() => {
    const onBlur = () => setIsFocused(false);
    const onFocus = () => setIsFocused(true);

    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // 3. Input Defense
  const preventDefault = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  return (
    <div 
        className="relative min-h-screen w-full select-none"
        onContextMenu={preventDefault}
        onDragStart={preventDefault}
        onCopy={preventDefault}
    >
      {/* OS Deception Overlay (Blur) */}
      {!isFocused && (
        <div className="fixed inset-0 z-[9999] bg-white/90 backdrop-blur-2xl flex flex-col items-center justify-center pointer-events-none">
           <div className="text-zinc-400 font-sans text-xl font-medium tracking-tight animate-pulse">
              System Paused
           </div>
           <div className="mt-2 text-zinc-300 text-sm">Click to Resume</div>
        </div>
      )}

      {/* Quantum Noise Overlay */}
      <div 
        className="fixed inset-0 z-[50] pointer-events-none opacity-[0.03] mix-blend-overlay"
        style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className={isFocused ? "" : "blur-lg transition-all duration-300"}>
        {children}
      </div>
    </div>
  );
}
