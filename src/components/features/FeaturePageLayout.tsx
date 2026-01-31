import Navigation from "@/components/landing/landing/Navigation";
import Footer from "@/components/landing/landing/Footer";

interface FeaturePageLayoutProps {
  children: React.ReactNode;
}

export default function FeaturePageLayout({ children }: FeaturePageLayoutProps) {
  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg">
        Skip to main content
      </a>
      <div className="min-h-screen bg-white text-black">
        <Navigation />

        <main id="main-content" role="main">
          {children}
        </main>

        <Footer />
      </div>
    </>
  );
}
