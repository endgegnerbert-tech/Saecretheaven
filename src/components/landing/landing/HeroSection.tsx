import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { SketchButton } from "@/sketch-ui/SketchButton";
import { motion, AnimatePresence } from "framer-motion";
import { Apple, Download, Smartphone, Laptop, Tablet, Users } from "lucide-react";
import { joinWaitlist, getWaitlistCount } from "@/app/actions/waitlist";

export default function HeroSection() {
  const [email, setEmail] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Dynamic waitlist data
  const totalSeats = 30;
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  const seatsRemaining = waitlistCount !== null ? Math.max(0, totalSeats - waitlistCount) : null;

  // Fetch waitlist count on mount
  useEffect(() => {
    const fetchCount = async () => {
      const count = await getWaitlistCount();
      setWaitlistCount(count);
    };
    fetchCount();
  }, []);
  const [deviceIndex, setDeviceIndex] = useState(0); // 0: Phone, 1: Tablet, 2: Desktop

  // Device switching logic - 2 seconds interval
  useEffect(() => {
    const interval = setInterval(() => {
      setDeviceIndex((prev) => (prev + 1) % 3);
    }, 2000); // Faster switching
    return () => clearInterval(interval);
  }, []);

  const deviceConfigs = [
    { width: 300, height: 610, radius: 45, name: 'Phone', type: 'mobile' },
    { width: 460, height: 600, radius: 32, name: 'Tablet', type: 'tablet' },
    { width: 620, height: 400, radius: 24, name: 'Laptop', type: 'desktop' }
  ];

  const currentConfig = deviceConfigs[deviceIndex];

  // Words to display - Reduced to 3
  const displayWords = ["Secure.", "Private.", "Safe."];

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
    if (isValid && !isSubmitting) {
      setIsSubmitting(true);
      try {
        const result = await joinWaitlist(email);
        if (result.success) {
          setIsSubmitted(true);
          setWaitlistCount(prev => (prev ?? 0) + 1);
          setEmail("");
        } else {
          setError(result.message || "Something went wrong.");
        }
      } catch (err) {
        setError("Failed to submit. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <section className="relative pt-32 pb-32 overflow-hidden min-h-[90vh]">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-light to-warm-white" />
      
      {/* Radial gradient overlays */}
      <div 
        className="absolute inset-0 opacity-100"
        style={{
          background: 'radial-gradient(circle at 30% 20%, rgba(102, 126, 234, 0.12), transparent 50%)'
        }}
      />
      <div 
        className="absolute inset-0 opacity-100"
        style={{
          background: 'radial-gradient(circle at 70% 80%, rgba(167, 139, 250, 0.08), transparent 40%)'
        }}
      />

      {/* Cloud textures */}
      <div className="absolute top-20 left-10 w-64 h-32 bg-white/30 rounded-full blur-3xl" />
      <div className="absolute top-40 right-20 w-96 h-48 bg-indigo-soft/8 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-1/3 w-80 h-40 bg-violet-gentle/8 rounded-full blur-3xl" />
      <div className="absolute top-60 left-1/2 w-72 h-36 bg-white/20 rounded-full blur-3xl" />

      <div className="relative max-w-[1280px] mx-auto px-8 lg:px-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Device Animation Mockup */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex justify-center order-2 lg:order-1 h-[650px] items-center"
          >
            <motion.div 
              className="relative bg-black transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)] shadow-2xl overflow-hidden"
              animate={{
                width: currentConfig.width,
                height: currentConfig.height,
                borderRadius: currentConfig.radius,
              }}
              style={{ 
                filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.3))'
              }}
            >
                {/* Dynamic Island / Camera Area */}
                <motion.div 
                    animate={{
                        width: currentConfig.type === 'mobile' ? 120 : (currentConfig.type === 'tablet' ? 8 : 100),
                        height: currentConfig.type === 'mobile' ? 30 : (currentConfig.type === 'tablet' ? 8 : 10),
                        top: currentConfig.type === 'mobile' ? 10 : (currentConfig.type === 'tablet' ? 8 : 8),
                        borderRadius: currentConfig.type === 'tablet' ? '50%' : '0 0 12px 12px'
                    }}
                    className="absolute left-1/2 transform -translate-x-1/2 bg-black z-20"
                />

              {/* Screen Content - Realistic PWA Gallery */}
              <div 
                className="absolute inset-[12px] bg-gray-50 rounded-[inherit] overflow-hidden flex flex-col"
              >
                {/* Gallery Header */}
                <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
                   <h1 className="text-lg font-semibold text-gray-900">Galerie</h1>
                   <div className="flex items-center gap-3">
                      <button className="text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                      <button className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-md font-medium">
                        Add
                      </button>
                   </div>
                </div>

                {/* Category Pills */}
                <div className="bg-white px-4 py-2 border-b border-gray-100 overflow-x-auto shrink-0">
                   <div className="flex gap-2">
                      <button className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full whitespace-nowrap">All</button>
                      <button className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full whitespace-nowrap">Nature</button>
                      <button className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full whitespace-nowrap">Architecture</button>
                      {currentConfig.type !== 'mobile' && (
                        <>
                          <button className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full whitespace-nowrap">Travel</button>
                          <button className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full whitespace-nowrap">Food</button>
                        </>
                      )}
                   </div>
                </div>

                {/* Photo Grid / Empty State */}
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-1 content-start">
                   {[...Array(12)].map((_, i) => (
                     <div key={i} className="aspect-square bg-gray-100 rounded-md relative overflow-hidden group">
                       <div className="absolute inset-0 bg-gray-200 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                       <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
                         <div className="bg-white/90 p-1.5 rounded-full shadow-sm">
                            <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                         </div>
                       </div>
                     </div>
                   ))}
                </div>

                {/* Bottom Navigation */}
                <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-around shrink-0">
                   <button className="flex flex-col items-center gap-1 text-blue-600">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                      </svg>
                      <span className="text-[10px] font-medium">Gallery</span>
                   </button>
                   <button className="flex flex-col items-center gap-1 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-[10px] font-medium">Options</span>
                   </button>
                </div>
              </div>

              {/* Reflection/Gloss */}
              <div className="absolute inset-0 rounded-[inherit] ring-1 ring-white/10 pointer-events-none" />
            </motion.div>

            {/* Caption below phone */}
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="text-center text-warm-gray text-sm mt-6 font-inter"
            >
              Your photos. <span className="text-indigo-soft font-medium">Encrypted</span>. <span className="text-indigo-soft font-medium">Private</span>. Always.
            </motion.p>
          </motion.div>

          {/* Right: Headline & CTAs */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.4, 0.0, 0.2, 1], delay: 0.2 }}
            className="order-1 lg:order-2"
          >
            {/* Badge */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-soft/10 rounded-full mb-6"
            >
              <span className="w-2 h-2 bg-success-green rounded-full animate-pulse" />
              <span className="text-sm text-indigo-soft font-medium">2026 Privacy Beta</span>
            </motion.div>

            <h1 className="font-syne text-[48px] lg:text-[64px] xl:text-[72px] leading-[1.05] font-bold text-charcoal mb-4">
              Seacretheaven
            </h1>
            <p className="font-space-grotesk text-xl lg:text-2xl text-charcoal/80 mb-2">
              Your Photos. Your Eyes Only.
            </p>
            <p className="font-inter text-base lg:text-lg text-warm-gray mb-6 leading-relaxed max-w-lg">
              End-to-end encrypted storage that lives on your device, not in big tech's cloud. 
              100% Private. 100% Yours. Only you hold the keys.
            </p>

            {/* Social Proof Counter */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mb-8"
            >
              <div className="flex flex-col gap-3">
                {/* Seats Remaining */}
                <div className="inline-flex items-baseline gap-2">
                  <span className="font-syne text-4xl lg:text-5xl font-bold text-indigo-soft">
                    {seatsRemaining === null ? "..." : seatsRemaining}
                  </span>
                  <span className="font-inter text-warm-gray text-sm lg:text-base">
                    Beta Spots Available
                  </span>
                </div>
                {/* People Joined */}
                {waitlistCount !== null && waitlistCount > 0 && (
                  <div className="inline-flex items-center gap-2 text-warm-gray">
                    <Users className="w-4 h-4 text-success-green" />
                    <span className="font-inter text-sm">
                      {waitlistCount} {waitlistCount === 1 ? 'person has' : 'people have'} joined
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-warm-gray mt-2">
                 {seatsRemaining === 0 ? "Waitlist is full, but join for future updates!" : "Join now, before they are taken."}
              </p>
            </motion.div>

            {/* Email Capture Form - Above the fold */}
            {!isSubmitted ? (
              <motion.form 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                onSubmit={handleSubmit}
                className="mb-8"
              >
                <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                  <div className="flex-1 relative">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={handleEmailChange}
                      disabled={isSubmitting}
                      className={`h-12 lg:h-[50px] px-5 font-inter text-base rounded-lg border-2 transition-all duration-300 bg-white/80 backdrop-blur-sm ${
                        error 
                          ? 'border-red-400 focus:border-red-500' 
                          : isValid 
                          ? 'border-success-green focus:border-success-green' 
                          : 'border-gray-200 focus:border-indigo-soft'
                      }`}
                    />
                    {error && (
                      <p className="absolute left-5 -bottom-5 text-xs text-red-500 font-inter">
                        {error}
                      </p>
                    )}
                  </div>
                  <SketchButton
                    type="submit"
                    disabled={!isValid || isSubmitting}
                    size="md"
                    variant="primary"
                  >
                    {isSubmitting ? "Joining..." : "Join Beta Now"}
                  </SketchButton>
                </div>
              </motion.form>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-8 p-4 bg-success-green/10 border border-success-green/30 rounded-xl max-w-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-success-green rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-charcoal">You're on the list!</p>
                    <p className="text-sm text-warm-gray">Check your inbox for confirmation.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Availability Text (Replaces Download Buttons) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="mt-8 p-6 rounded-2xl bg-white/50 border border-white/60 backdrop-blur-sm"
            >
              <div className="flex flex-col gap-3">
                 <div className="flex items-center gap-3 text-charcoal">
                    <Smartphone className="text-indigo-soft" />
                    <span className="font-inter text-base">
                        Available as <span className="font-bold">PWA</span> for Mobile & iPad
                    </span>
                 </div>
                 <div className="flex items-center gap-3 text-charcoal">
                    <Laptop className="text-violet-gentle" />
                    <span className="font-inter text-base">
                        Available as <span className="font-bold">Tauri App</span> for Mac & Windows
                    </span>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
