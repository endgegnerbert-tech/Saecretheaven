"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { LoadingScreen } from "@/components/ui/loading-spinner";

// Landing Page Components
import Navigation from "@/components/landing/landing/Navigation";
import ScrollyTellingHero from "@/components/landing/landing/ScrollyTellingHero";
import SecurityGrid from "@/components/landing/landing/SecurityGrid";
import ComparisonTable from "@/components/landing/landing/ComparisonTable";
import TechnicalAccordion from "@/components/landing/landing/TechnicalAccordion";
import WaitlistSection from "@/components/landing/landing/WaitlistSection";
import CountdownTimer from "@/components/landing/landing/CountdownTimer";

export default function LandingPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionLoading } = useSession();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // If user is authenticated, redirect to /app
    if (!isSessionLoading && session?.user) {
      setIsRedirecting(true);
      router.push("/app");
    }
  }, [session, isSessionLoading, router]);

  if (isSessionLoading || isRedirecting) {
    return <LoadingScreen text={isRedirecting ? "Redirecting to your vault..." : "Loading..."} />;
  }

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg">
        Skip to main content
      </a>
      <div className="min-h-screen bg-white text-black">
        <Navigation />
        <CountdownTimer />
        
        <main id="main-content" role="main">
          {/* 1. ScrollyTelling Hero (Hero + Video + Split) */}
          <ScrollyTellingHero />
          
          {/* 3. Security Cards */}
          <SecurityGrid />
          
          {/* 4. Comparison Table */}
          <ComparisonTable />
          
          {/* 5. Technical Deep Dive */}
          <TechnicalAccordion />
          
          {/* 6. Final Waitlist CTA */}
          <WaitlistSection />
        </main>
        
        {/* Footer */}
        <footer className="bg-[#111111] text-white py-12 lg:py-16" role="contentinfo">
          <div className="max-w-[1280px] mx-auto px-8 lg:px-20">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-10 lg:mb-12">
              <div className="col-span-2 lg:col-span-1">
                <h2 className="font-syne text-xl font-bold mb-4">SaecretHeaven</h2>
                <p className="font-inter text-sm text-gray-400 leading-relaxed mb-4">
                  Zero-knowledge photo vault with military-grade encryption. Your photos, your eyes only.
                </p>
                <div className="flex flex-col gap-3 mb-4">
                  <a
                    href="https://github.com/endgegnerbert-tech/Photovault"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    Open Source on GitHub
                  </a>
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-block px-2 py-1 bg-blue-600/20 text-blue-400 text-xs font-mono rounded border border-blue-500/30">
                      BSL 1.1
                    </span>
                    <span className="text-xs text-gray-500">
                      Source Available
                    </span>
                  </div>
                </div>
              </div>
              {/* ... other footer columns ... */}
            </div>
            <div className="border-t border-gray-700 pt-8 flex flex-col lg:flex-row justify-between items-center gap-4">
              <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-8">
                <p className="font-inter text-xs text-gray-400">
                  © 2026 SaecretHeaven. All rights reserved.
                </p>
                <nav aria-label="Footer navigation" className="flex gap-6">
                  <a href="/privacy" className="font-inter text-xs text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
                  <a href="/terms" className="font-inter text-xs text-gray-400 hover:text-white transition-colors">Terms of Service</a>
                  <a href="/impressum" className="font-inter text-xs text-gray-400 hover:text-white transition-colors">Legal Notice</a>
                  <a href="/credits" className="font-inter text-xs text-gray-400 hover:text-white transition-colors">Credits</a>
                </nav>
              </div>
              
              <div className="flex gap-6" aria-label="Security badges">
                <span className="font-inter text-xs text-gray-400">End-to-End Encrypted</span>
                <span className="font-inter text-xs text-gray-400">EU Servers</span>
                <span className="font-inter text-xs text-gray-400">Zero-Knowledge</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
