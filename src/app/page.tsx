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
                <div className="flex gap-4">
                  {/* Social links placeholder */}
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
