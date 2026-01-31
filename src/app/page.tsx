"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { LoadingScreen } from "@/components/ui/loading-spinner";

// Landing Page Components
import Navigation from "@/components/landing/landing/Navigation";
import ScrollyTellingHero from "@/components/landing/landing/ScrollyTellingHero";
import SecurityGrid from "@/components/landing/landing/SecurityGrid";
import TechnicalAccordion from "@/components/landing/landing/TechnicalAccordion";
import LandingComments from "@/components/landing/landing/LandingComments";
import Footer from "@/components/landing/landing/Footer";

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
        
        <main id="main-content" role="main">
          {/* 1. ScrollyTelling Hero (Hero + Video + Split) */}
          <ScrollyTellingHero />

          {/* 2. Feature Overview */}
          <SecurityGrid />

          {/* 3. Technical Deep Dive */}
          <TechnicalAccordion />

          {/* 4. Community Comments */}
          <LandingComments />
        </main>
        
        <Footer />
      </div>
    </>
  );
}
