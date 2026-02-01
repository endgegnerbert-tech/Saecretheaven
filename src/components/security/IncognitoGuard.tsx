"use client";

import { useEffect, useState } from "react";
import { EyeOff, Copy, ShieldAlert, Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IncognitoGuardProps {
  children: React.ReactNode;
}

export function IncognitoGuard({ children }: IncognitoGuardProps) {
  const [isIncognito, setIsIncognito] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    detectIncognito().then((result) => {
      setIsIncognito(result);
      setIsLoading(false);
    });
  }, []);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied! Open a Private/Incognito window and paste it.");
    }
  };

  const handleForceUnlock = () => {
    if (confirm("Allowing this in a standard browser leaves traces (History, Cache). Are you sure you want to proceed?")) {
        setIsIncognito(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
        <RefreshCw className="w-8 h-8 animate-spin mb-4 text-zinc-500" />
        <p className="text-zinc-500 text-sm tracking-widest">ANALYZING BROWSER SECURITY...</p>
      </div>
    );
  }

  // If we think it's NOT incognito (or detection failed and we default to strict), show gate
  if (!isIncognito) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Background Noise/Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px]" />
        
        <div className="z-10 max-w-md w-full bg-zinc-900/80 backdrop-blur-xl border border-red-900/30 p-8 rounded-3xl shadow-2xl">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-red-500/20">
            <EyeOff className="w-10 h-10 text-red-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">Incognito Required</h1>
          <p className="text-zinc-400 mb-8 leading-relaxed">
            To prevent digital forensics and local logging, this secure link can 
            <span className="text-red-400 font-medium"> only be opened in Incognito / Private Mode</span>.
          </p>

          <div className="space-y-4">
            <Button 
                onClick={handleCopyLink} 
                className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-semibold"
            >
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
            </Button>
            
            <div className="text-xs text-zinc-600 mt-6 pt-6 border-t border-zinc-800">
                <p className="mb-2">Already in Incognito?</p>
                <button 
                    onClick={handleForceUnlock}
                    className="text-zinc-500 hover:text-zinc-300 underline decoration-zinc-700 underline-offset-4"
                >
                    Force Unblock (I accept the risks)
                </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Attempt to detect Incognito mode using storage quota heuristics.
 * NOTE: Browsers constantly patch these leaks. This is a best-effort check.
 */
async function detectIncognito(): Promise<boolean> {
  // 1. New FileSystem API (Chrome/Edge)
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const { quota } = await navigator.storage.estimate();
      // In Incognito, quota is usually capped at ~120MB or 10% of disk
      // In Normal, it's usually much larger (billions).
      if (quota && quota < 150 * 1024 * 1024) { // < 150MB
        return true;
      }
    } catch {
        // Ignore
    }
  }

  // 2. Firefox: specific db errors (IndexedDB blob storage) - complex to implement here reliably.
  
  // 3. Safari: often blocks LocalStorage in strict mode, or quota acts differently.
  
  // Default: Assume FALSE (Require unlock) for maximum strictness as requested.
  // Or return FALSE to trigger the gate.
  return false;
}
