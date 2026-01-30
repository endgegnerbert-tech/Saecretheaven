"use client";

import { useState, useEffect } from "react";
import { Menu, X, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SketchButton } from "@/sketch-ui/SketchButton";

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const navLinks = [
    { label: "Features", id: "features" },
    { label: "Security", id: "security" },
    { label: "Compare", id: "compare" },
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
          <div className="font-syne text-xl font-bold tracking-tight">SaecretHeaven</div>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollToSection(link.id)}
              className="font-inter text-sm text-charcoal/70 hover:text-charcoal transition-colors"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-4">
          <a
            href="https://github.com/endgegnerbert-tech/Photovault"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-charcoal/70 hover:text-charcoal transition-colors"
            aria-label="View source on GitHub"
          >
            <Code size={20} />
          </a>
          <SketchButton
            variant="secondary"
            size="md"
            onClick={() => window.location.href = '/app'}
          >
            Launch App
          </SketchButton>
          <SketchButton
            variant="primary"
            size="md"
            onClick={() => scrollToSection('waitlist')}
          >
            Waitlist
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
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="font-inter text-base text-charcoal py-3 px-4 rounded-lg hover:bg-gray-50 text-left transition-colors"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-2 mt-2 border-t border-gray-100 space-y-2">
              <SketchButton 
                variant="secondary"
                size="md"
                onClick={() => window.location.href = '/app'}
                className="w-full"
              >
                Launch App
              </SketchButton>
              <div className="flex justify-center">
                <SketchButton 
                  variant="primary"
                  size="md"
                  onClick={() => scrollToSection('waitlist')}
                  className="w-full"
                >
                  Join Waitlist
                </SketchButton>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
