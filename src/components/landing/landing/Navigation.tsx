"use client";

import { useState, useEffect } from "react";
import { Menu, X, Code, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SketchButton } from "@/sketch-ui/SketchButton";

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [featuresDropdownOpen, setFeaturesDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      const offset = 80;
      const elementPosition = section.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    setIsMobileMenuOpen(false);
  };

  const featurePages = [
    { label: "Panic Button", href: "/features/panic-button" },
    { label: "Secure Drop", href: "/features/secure-drop" },
    { label: "Metadata Removal", href: "/features/metadata-removal" },
    { label: "Decoy Accounts", href: "/features/decoy-accounts" },
  ];

  return (
    <header 
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/90 backdrop-blur-lg shadow-sm border-b border-gray-100' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1280px] mx-auto flex h-16 lg:h-20 items-center justify-between px-6 lg:px-20">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="SaecretHeaven Logo" className="w-8 h-8" />
          <div className="font-syne text-xl font-bold tracking-tight text-blue-600">SaecretHeaven</div>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8">
          {/* Features Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setFeaturesDropdownOpen(true)}
            onMouseLeave={() => setFeaturesDropdownOpen(false)}
          >
            <button
              onClick={() => scrollToSection('security')}
              className="font-inter text-sm text-charcoal/70 hover:text-charcoal transition-colors flex items-center gap-1"
            >
              Features
              <ChevronDown size={16} className={`transition-transform ${featuresDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {featuresDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
                {featurePages.map((feature) => (
                  <a
                    key={feature.href}
                    href={feature.href}
                    className="block px-4 py-2.5 font-inter text-sm text-charcoal/70 hover:text-charcoal hover:bg-gray-50 transition-colors"
                  >
                    {feature.label}
                  </a>
                ))}
              </div>
            )}
          </div>


          {/* Community Link */}
          <button
            onClick={() => scrollToSection('community')}
            className="font-inter text-sm text-charcoal/70 hover:text-charcoal transition-colors hover:text-blue-600"
          >
            Community
          </button>

          {/* Technical Link */}
          <button
            onClick={() => scrollToSection('technical')}
            className="font-inter text-sm text-charcoal/70 hover:text-charcoal transition-colors"
          >
            Technical
          </button>

          <a
            href="/manifesto"
            className="font-inter text-sm text-charcoal/70 hover:text-charcoal transition-colors"
          >
            Manifesto
          </a>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-4">
          <a
            href="https://github.com/endgegnerbert-tech/Saecretheaven"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-charcoal/70 hover:text-charcoal transition-colors"
            aria-label="View source on GitHub"
          >
            <Code size={20} />
          </a>
          <SketchButton
            variant="primary"
            size="md"
            onClick={() => window.location.href = '/app'}
          >
            Launch App
          </SketchButton>
        </div>

        {/* Mobile Menu Button */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-2 text-charcoal"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg">
          <nav className="flex flex-col p-4 gap-2">
            {/* Features with sub-links */}
            <div className="flex flex-col">
              <button
                onClick={() => {
                  scrollToSection('security');
                }}
                className="font-inter text-base text-charcoal py-3 px-4 rounded-lg hover:bg-gray-50 text-left transition-colors font-semibold"
              >
                Features
              </button>
              <div className="ml-4 flex flex-col gap-1">
                {featurePages.map((feature) => (
                  <a
                    key={feature.href}
                    href={feature.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="font-inter text-sm text-charcoal/70 py-2 px-4 rounded-lg hover:bg-gray-50 text-left transition-colors"
                  >
                    {feature.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Community Link */}
            <button
              onClick={() => scrollToSection('community')}
              className="font-inter text-base text-charcoal py-3 px-4 rounded-lg hover:bg-gray-50 text-left transition-colors font-semibold"
            >
              Community
            </button>

            {/* Technical Link */}
            <button
              onClick={() => scrollToSection('technical')}
              className="font-inter text-base text-charcoal py-3 px-4 rounded-lg hover:bg-gray-50 text-left transition-colors font-semibold"
            >
              Technical
            </button>

            <a
              href="/manifesto"
              className="font-inter text-base text-charcoal py-3 px-4 rounded-lg hover:bg-gray-50 text-left transition-colors font-semibold"
            >
              Manifesto
            </a>

            <div className="pt-2 mt-2 border-t border-gray-100">
              <SketchButton
                variant="primary"
                size="md"
                onClick={() => window.location.href = '/app'}
                className="w-full"
              >
                Launch App
              </SketchButton>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
