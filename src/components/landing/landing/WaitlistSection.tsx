import { useState, useEffect } from "react";
import { joinWaitlist, getWaitlistCount } from "@/app/actions/waitlist";
import { Button } from "@/components/ui/button";
import { SketchButton } from "@/sketch-ui/SketchButton";
import { Input } from "@/components/ui/input";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Check, Download, Smartphone } from "lucide-react";
import Link from "next/link";

// GitHub Release download URLs
const GITHUB_REPO = "endgegnerbert-tech/Photovault";
const VERSION = "0.1.0";

const getDownloadUrl = () => {
  if (typeof window === "undefined") return "";

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform.toLowerCase();

  // Detect macOS
  if (platform.includes("mac")) {
    // Check for Apple Silicon (M1/M2/M3)
    if (userAgent.includes("arm") || userAgent.includes("aarch64")) {
      return `https://github.com/${GITHUB_REPO}/releases/latest/download/SaecretHeaven_aarch64.dmg`;
    }
    // Intel Mac
    return `https://github.com/${GITHUB_REPO}/releases/latest/download/SaecretHeaven_x64.dmg`;
  }

  // Detect Windows
  if (platform.includes("win")) {
    return `https://github.com/${GITHUB_REPO}/releases/latest/download/SaecretHeaven_${VERSION}_x64_en-US.msi`;
  }

  // Detect Linux
  if (platform.includes("linux")) {
    return `https://github.com/${GITHUB_REPO}/releases/latest/download/saecret-heaven_${VERSION}_amd64.deb`;
  }

  // Fallback to releases page
  return `https://github.com/${GITHUB_REPO}/releases/latest`;
};

export default function WaitlistSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });

  const [email, setEmail] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  // Scarcity: 30 beta seats total, dynamic remaining based on waitlist signups
  const totalSeats = 30;
  const [seatsRemaining, setSeatsRemaining] = useState<number | null>(null);

  // Fetch waitlist count on mount
  useEffect(() => {
    const fetchCount = async () => {
      const count = await getWaitlistCount();
      // Subtract signups from total, minimum 0
      setSeatsRemaining(Math.max(0, totalSeats - count));
    };
    fetchCount();
  }, []);

  // Set download URL based on OS
  useEffect(() => {
    setDownloadUrl(getDownloadUrl());
  }, []);

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setError("");
    
    if (value.length > 0) {
      setIsValid(validateEmail(value));
      if (!validateEmail(value)) {
        setError("Please enter a valid email address");
      }
    } else {
      setIsValid(false);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      try {
        const result = await joinWaitlist(email);
        if (result.success) {
          setIsSubmitted(true);
          setSeatsRemaining(prev => Math.max(0, (prev ?? totalSeats) - 1));
        } else {
          setError(result.message || "Something went wrong.");
        }
      } catch (err) {
        setError("Failed to submit. Please try again.");
      }
    }
  };

  return (
    <section id="waitlist" className="py-32 lg:py-40 bg-gradient-to-b from-white via-sky-light/30 to-sky-light relative overflow-hidden">
      {/* Background decorations - Hidden on mobile for performance */}
      <div className="hidden lg:block absolute top-20 left-20 w-96 h-96 bg-indigo-soft/5 rounded-full blur-3xl" />
      <div className="hidden lg:block absolute bottom-20 right-20 w-96 h-96 bg-violet-gentle/5 rounded-full blur-3xl" />
      <div className="hidden lg:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/50 rounded-full blur-3xl" />
      
      <div className="relative max-w-[1280px] mx-auto px-8 lg:px-20">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, ease: [0.4, 0.0, 0.2, 1] }}
          className="text-center"
        >
          {/* Scarcity Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-3 px-6 py-3 bg-warning-amber/10 border border-warning-amber/20 rounded-full mb-8"
          >
            <span className="w-2 h-2 bg-warning-amber rounded-full animate-pulse" />
            <span className="font-space-grotesk text-lg font-semibold text-warning-amber">
              {seatsRemaining === null ? (
                "Loading..."
              ) : seatsRemaining === 0 ? (
                "Waitlist is full!"
              ) : (
                `Only ${seatsRemaining} beta seats left!`
              )}
            </span>
          </motion.div>

          <h2 className="font-space-grotesk text-[40px] lg:text-[48px] font-semibold text-charcoal mb-4">
            Stop Feeding the Algorithm.
          </h2>
          <p className="font-inter text-lg lg:text-xl text-warm-gray max-w-2xl mx-auto mb-4">
            Take back control of your digital life. Join the resistance against surveillance capitalism.
          </p>
          <p className="font-jetbrains text-sm text-indigo-soft mb-10">
            Your photos. Your eyes only. Zero compromises.
          </p>

          {/* Waitlist Form */}
          {!isSubmitted ? (
            <motion.form 
              onSubmit={handleSubmit} 
              className="max-w-lg mx-auto mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={handleEmailChange}
                    aria-label="Email address for waitlist"
                    className={`h-14 lg:h-16 px-6 font-inter text-base lg:text-lg rounded-full border-2 transition-all duration-300 bg-white ${
                      error 
                        ? 'border-red-400 focus:border-red-500' 
                        : isValid 
                        ? 'border-success-green focus:border-success-green' 
                        : 'border-gray-200 focus:border-indigo-soft'
                    }`}
                  />
                  {error && (
                    <p className="absolute left-6 -bottom-6 text-xs text-red-500 font-inter">
                      {error}
                    </p>
                  )}
                </div>
                <SketchButton
                  type="submit"
                  disabled={!isValid}
                  size="lg"
                  variant="primary"
                >
                  Request Access
                </SketchButton>
              </div>
              <p className="mt-4 text-sm text-warm-gray">
                <span className="font-semibold text-indigo-soft">Pro Tip:</span> Refer a friend to jump ~100 spots in line.
              </p>
            </motion.form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
              className="max-w-lg mx-auto mb-10 p-8 bg-white rounded-3xl border-2 border-success-green/20"
              style={{
                boxShadow: '0 4px 40px rgba(16, 185, 129, 0.15)'
              }}
            >
              <div className="flex flex-col items-center gap-4">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-16 h-16 bg-success-green rounded-full flex items-center justify-center"
                >
                  <Check className="text-white" size={32} strokeWidth={3} />
                </motion.div>
                <div className="text-center">
                  <p className="font-space-grotesk text-2xl font-semibold text-charcoal mb-2">
                    You're on the list!
                  </p>
                  <p className="font-inter text-warm-gray">
                    Check your inbox for confirmation. We review requests within 48 hours.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Alternative Download Options */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center gap-5"
          >
            <p className="font-inter text-sm text-warm-gray">
              Or try the public beta now:
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/app">
                <SketchButton
                  variant="outline"
                  size="lg"
                >
                  <Smartphone className="mr-2" size={20} />
                  PWA Now
                </SketchButton>
              </Link>
              <a
                href={downloadUrl || `https://github.com/${GITHUB_REPO}/releases/latest`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <SketchButton
                  variant="outline"
                  size="lg"
                >
                  <Download className="mr-2" size={20} />
                  Download Desktop
                </SketchButton>
              </a>
            </div>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-12 flex flex-wrap justify-center gap-8"
          >
            {[
              "End-to-End Encrypted",
              "GDPR Compliant", 
              "Zero-Knowledge"
            ].map((badge, i) => (
              <span key={i} className="font-inter text-sm text-warm-gray">
                {badge}
              </span>
            ))}
          </motion.div>

          {/* Privacy Notice */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-8 font-inter text-xs text-warm-gray max-w-lg mx-auto"
          >
            By joining, you agree to receive product updates. We'll never share your email. 
            You can unsubscribe anytime. See our{" "}
            <a href="#" className="text-indigo-soft hover:underline">Privacy Policy</a>.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
