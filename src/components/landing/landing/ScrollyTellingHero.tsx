"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent } from "framer-motion";
import { Input } from "@/components/ui/input";
import { SketchButton } from "@/sketch-ui/SketchButton";
import { Smartphone, Lock, Cloud, Eye, Play, Check, ChevronDown, Volume2, VolumeX } from "lucide-react";
import { joinWaitlist, getWaitlistCount } from "@/app/actions/waitlist";

// --- Split Tile Component ---
interface SplitTileProps {
  index: number;
  isActive: boolean;
  imageUrl: string;
  title: string;
  description: string;
  bullet: string;
  icon: React.ReactNode;
  delay: number;
  isMobile: boolean;
}

function SplitTile({ index, isActive, imageUrl, title, description, bullet, icon, delay, isMobile }: SplitTileProps) {
  const tilePositions = [
    { x: isMobile ? -140 : -320, y: isMobile ? -200 : -240, rotate: -12 }, 
    { x: isMobile ? 140 : 320, y: isMobile ? -200 : -240, rotate: 12 },   
    { x: isMobile ? -140 : -320, y: isMobile ? 200 : 240, rotate: -6 },   
    { x: isMobile ? 140 : 320, y: isMobile ? 200 : 240, rotate: 6 },     
  ];
  
  const pos = tilePositions[index];
  
  return (
    <motion.div
      initial={{ x: 0, y: 0, rotateY: 0, rotateX: 0, scale: 0.5, opacity: 0 }}
      animate={isActive ? {
        x: pos.x,
        y: pos.y,
        rotateY: pos.rotate * 3,
        rotateX: -15,
        scale: isMobile ? 0.85 : 1,
        opacity: 1
      } : {
        x: 0, y: 0, rotateY: 0, rotateX: 0, scale: 0.5, opacity: 0 
      }}
      transition={{ duration: 0.8, delay: delay, ease: [0.34, 1.56, 0.64, 1] }} // Spring-like ease
      className="absolute w-[200px] h-[320px] origin-center cursor-pointer will-change-transform z-50"
      style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
    >
      <div 
        className="w-full h-full rounded-2xl overflow-hidden relative bg-white border border-gray-100"
        style={{
          boxShadow: isActive ? '0 20px 50px rgba(102, 126, 234, 0.25)' : 'none',
          backfaceVisibility: 'hidden'
        }}
      >
        <div className="w-full h-3/5 bg-gray-50 overflow-hidden relative group">
          <img src={imageUrl} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" style={{ objectPosition: `${index * 25}% 50%` }} />
          <div className="absolute inset-0 bg-black/5" />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-2/5 p-4 flex flex-col items-center justify-center text-center bg-white">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mb-2">
               <div className="text-blue-900 scale-75">{icon}</div>
            </div>
            <h4 className="font-syne text-sm font-bold text-gray-900 leading-tight mb-1">{title}</h4>
            <p className="text-[11px] text-gray-500 font-medium">{bullet}</p>
        </div>
      </div>
    </motion.div>
  );
}

function CountdownDisplay() {
  const [timeLeft, setTimeLeft] = useState({ days: 4, hours: 12, minutes: 45, seconds: 22 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-baseline gap-1 font-mono text-sm font-bold text-gray-900 leading-none">
       <div className="flex flex-col items-center">
          <span>{timeLeft.days.toString().padStart(2, '0')}</span>
          <span className="text-[8px] text-gray-400 font-sans font-normal uppercase">Days</span>
       </div>
       <span className="text-gray-300">:</span>
       <div className="flex flex-col items-center">
          <span>{timeLeft.hours.toString().padStart(2, '0')}</span>
          <span className="text-[8px] text-gray-400 font-sans font-normal uppercase">Hrs</span>
       </div>
       <span className="text-gray-300">:</span>
       <div className="flex flex-col items-center">
          <span>{timeLeft.minutes.toString().padStart(2, '0')}</span>
          <span className="text-[8px] text-gray-400 font-sans font-normal uppercase">Min</span>
       </div>
       <span className="text-gray-300">:</span>
       <div className="flex flex-col items-center">
          <span className="text-blue-600">{timeLeft.seconds.toString().padStart(2, '0')}</span>
          <span className="text-[8px] text-gray-400 font-sans font-normal uppercase">Sec</span>
       </div>
    </div>
  );
}

export default function ScrollyTellingHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const [email, setEmail] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  const totalSeats = 30;
  const seatsRemaining = waitlistCount !== null ? Math.max(0, totalSeats - waitlistCount) : null;
  const [isMobile, setIsMobile] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  
  // Device Switching
  const [deviceIndex, setDeviceIndex] = useState(2); // Start with Laptop (Index 2)
  const deviceConfigs = [
    { width: 300, height: 520, radius: 40, name: 'Phone', type: 'mobile' },  // Phone (Optimized for Mobile View)
    { width: 500, height: 680, radius: 36, name: 'Tablet', type: 'tablet' },
    { width: 640, height: 400, radius: 24, name: 'Laptop', type: 'desktop' } // Laptop
  ];
  
  const [isAtTop, setIsAtTop] = useState(true);

  // Resize Listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchCount = async () => setWaitlistCount(await getWaitlistCount());
    fetchCount();
  }, []);

  // Device Switcher Interval (Only at top)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isAtTop) setDeviceIndex((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, [isAtTop]);

  // Track if we are at the top to enable switching
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setIsAtTop(latest < 0.02);
  });

  // Active Config Logic:
  // If scrolling (>2%), LOCK to Phone (Config[0]).
  // If at top, cycle through Configs.
  const activeConfig = isAtTop ? deviceConfigs[deviceIndex] : deviceConfigs[0];


  // --- ANIMATION VALUES ---
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 80, damping: 20 });

  // 1. HORIZONTAL MOVEMENT
  // Desktop: Text on Left, Phone on Right.
  // Phone starts at +25% (Right) and moves to 0% (Center).
  const phoneX = useTransform(smoothProgress, [0, 0.2], isMobile ? ["0%", "0%"] : ["25%", "0%"]);

  // 2. HERO TEXT EXIT
  const heroOpacity = useTransform(smoothProgress, [0, 0.15], [1, 0]);
  const heroY = useTransform(smoothProgress, [0, 0.15], [0, -50]);
  const heroScale = useTransform(smoothProgress, [0, 0.15], [1, 0.95]);

  // 3. MORPHING CONTAINER
  // Width: Config -> Config -> 90vw (Video) -> 320px (Phone Split)
  const animWidth = useTransform(smoothProgress, 
    [0, 0.25, 0.35, 0.60, 0.70], 
    ["320px", "320px", "90vw", "90vw", "320px"] 
  );
  // We use a separate value for the "At Top" state to allow standard CSS transition for the switcher
  // When scrolling, we override with the motion value.

  const animHeight = useTransform(smoothProgress, 
    [0, 0.25, 0.35, 0.60, 0.70], 
    ["640px", "640px", "80vh", "80vh", "640px"] 
  );
  const animRadius = useTransform(smoothProgress, 
    [0, 0.25, 0.35, 0.60, 0.70], 
    [48, 48, 16, 16, 48] 
  );
  
  // 4. CONTENT LAYERS
  const galleryOpacity = useTransform(smoothProgress, [0.25, 0.30], [1, 0]);
  const videoOpacity = useTransform(smoothProgress, [0.28, 0.35, 0.60, 0.67], [0, 1, 1, 0]);
  
  // 5. SPLIT PHASE EFFECTS (Background Phone)
  const phoneContainerOpacity = useTransform(smoothProgress, [0.65, 0.75], [1, 0.15]); 
  const phoneContainerScale = useTransform(smoothProgress, [0.65, 0.75], [1, 0.85]); 
  const phoneContainerBlur = useTransform(smoothProgress, [0.65, 0.75], ["0px", "10px"]);
  
  // 6. TILE ACTIVATION
  const isSplitActive = useTransform(smoothProgress, (v) => v > 0.72);
  const [splitActiveState, setSplitActiveState] = useState(false);
  useMotionValueEvent(isSplitActive, "change", setSplitActiveState);

  // Form Logic
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setIsValid(validateEmail(e.target.value));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid && !isSubmitting) {
      setIsSubmitting(true);
    const res = await joinWaitlist(email);
      if (res.success) { setIsSubmitted(true); setWaitlistCount(p => (p ?? 0) + 1); setEmail(""); } 
      setIsSubmitting(false);
    }
  };

  const tiles = [
    { imageUrl: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=400&q=80', title: "Encrypted on Device", description: "Photos are encrypted before upload.", bullet: "Keys stay with you", icon: <Smartphone className="w-5 h-5" /> }, // Code/Screen
    { imageUrl: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=400&q=80', title: "Military Grade", description: "XSalsa20-Poly1305 Standard.", bullet: "Unbreakable Security", icon: <Lock className="w-5 h-5" /> }, // Shield/Blue
    { imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80', title: "Decentralized", description: "Stored across secure IPFS nodes.", bullet: "IPFS Network", icon: <Cloud className="w-5 h-5" /> }, // Globe/Network
    { imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80', title: "Private by Design", description: "We cannot see your photos.", bullet: "Zero Knowledge", icon: <Eye className="w-5 h-5" /> } // Abstract Flow
  ];

  return (
    <div ref={containerRef} className="relative h-[450vh] bg-white">
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 via-white to-white" />
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/20 rounded-full blur-3xl" />
      </div>

      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        <div className="relative w-full max-w-[1440px] px-6 lg:px-20 h-full flex items-center justify-center">
            
            {/* GRID LAYOUT: Text Left / Phone Right */}
            {/* The Text div is Absolute so it doesn't push the centered content, BUT we align it to the left column using grid simulation */}
            <motion.div 
                style={{ opacity: heroOpacity, y: heroY, scale: heroScale }}
                className="absolute inset-0 z-30 pointer-events-none flex items-center items-start lg:items-center"
            >
               <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center px-4 lg:px-12 w-full">
                  {/* TEXT COLUMN (Left) */}
                  <div className="flex flex-col justify-center w-full pt-[12vh] lg:pt-0 pointer-events-none relative z-40">
                      {/* Release Timer Badge - ADDED GLASS BACKGROUND FOR MOBILE */}
                      {/* Release Timer Badge - ADDED GLASS BACKGROUND FOR MOBILE */}
                      <div className="pointer-events-auto inline-flex items-center gap-2.5 px-4 py-2 bg-white/90 lg:bg-black/5 backdrop-blur-xl lg:backdrop-blur-sm rounded-lg mb-8 border border-black/[0.05] lg:border-black/10 shadow-lg lg:shadow-sm group hover:border-black/20 transition-all mx-auto lg:mx-0 max-w-fit">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                          </span>
                          <div className="flex flex-col leading-none">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-0.5">Limited Access</span>
                            <span className="text-sm font-mono font-bold text-gray-900">
                                {seatsRemaining !== null ? (
                                  <>
                                    <span className="text-red-600">{seatsRemaining.toString().padStart(3, '0')}</span> 
                                    <span className="ml-1">SEATS LEFT</span>
                                  </>
                                ) : 'BETA FULL'}
                            </span>
                          </div>
                      </div>
                      
                      {/* Text Content with Mobile Backdrop */}
                      <div className="lg:contents flex flex-col items-center text-center lg:text-left bg-white/80 lg:bg-transparent backdrop-blur-lg lg:backdrop-blur-none p-8 lg:p-0 rounded-3xl lg:rounded-none shadow-xl lg:shadow-none border border-white/50 lg:border-none mx-4 lg:mx-0">
                          <h1 className="pointer-events-auto text-4xl lg:text-7xl font-bold text-black mb-6 leading-[1.1] tracking-tight">
                            Seacret<span className="text-blue-700">heaven</span>
                          </h1>
                          <p className="pointer-events-auto text-base lg:text-xl text-black/80 lg:text-black mb-8 max-w-lg leading-relaxed mix-blend-multiply lg:mix-blend-normal">
                            Your Photos. Your Eyes Only. End-to-end encrypted storage that lives on your device, not in big tech's cloud.
                          </p>
                          
                          {!isSubmitted ? (
                          <form onSubmit={handleSubmit} className="pointer-events-auto flex flex-col sm:flex-row gap-3 max-w-md w-full">
                              <Input 
                                placeholder="Enter your email" 
                                value={email} 
                                onChange={handleEmailChange} 
                                className="bg-white border-gray-200 h-12 shadow-sm focus:border-indigo-500 transition-colors" 
                              />
                              <SketchButton type="submit" disabled={!isValid || isSubmitting} variant="primary" size="md">
                                Join Beta
                              </SketchButton>
                          </form>
                          ) : (
                          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 text-black font-medium w-full justify-center lg:justify-start">
                            <div className="bg-blue-600 text-white p-1 rounded-full"><Check size={14} /></div> 
                            You're on the list!
                          </div>
                          )}
                      </div>
                  </div>
                  
                  
                  {/* SPACER COLUMN (Right - where Phone sits) */}
                  <div className="hidden lg:block pl-12">
                     {/* The phone is absolutely positioned by the parent, but we leave this space empty for layout balance */}
                  </div>
               </div>
            </motion.div>


            {/* ACTOR: MOVING PHONE Container */}
            <motion.div
                className="relative z-20 flex justify-center items-center"
                style={{ 
                    x: phoneX, // Desktop: Starts Right (25%), Moves Center (0%)
                    width: '100%',
                    height: '100%'
                }} 
            >
                 {/* 1. MORPHING DEVICE (Background in Split Phase) */}
                <motion.div 
                    className="relative bg-black shadow-2xl overflow-hidden z-10 will-change-transform"
                    animate={isAtTop ? {
                        width: activeConfig.width,
                        height: activeConfig.height,
                        borderRadius: activeConfig.radius,
                    } : {
                        // When scrolling, Framer Motion values ('animWidth') take over via style prop
                    }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    style={{ 
                        width: isAtTop ? activeConfig.width : animWidth,
                        height: isAtTop ? activeConfig.height : animHeight,
                        borderRadius: isAtTop ? activeConfig.radius : animRadius,
                        
                        opacity: phoneContainerOpacity,
                        scale: phoneContainerScale,
                        filter: useTransform(phoneContainerBlur, (v) => `blur(${v})`),
                        boxShadow: '0 25px 80px -12px rgba(0, 0, 0, 0.4)', // Deep shadow
                        outline: '1px solid rgba(255,255,255,0.1)'
                    }}
                >
                    {/* DEVICE BORDERS (Notch/Island) */}
                    <motion.div style={{ opacity: galleryOpacity }} className="absolute inset-0 pointer-events-none z-50">
                        {/* Island Morphing */}
                         <motion.div 
                            animate={{
                                width: activeConfig.type === 'mobile' ? 120 : (activeConfig.type === 'tablet' ? 8 : 96),
                                height: activeConfig.type === 'mobile' ? 32 : (activeConfig.type === 'tablet' ? 8 : 12),
                                borderRadius: activeConfig.type === 'tablet' ? '50%' : '0 0 14px 14px',
                                top: activeConfig.type === 'mobile' ? 12 : 12
                            }}
                            className="absolute left-1/2 transform -translate-x-1/2 bg-black z-50 shadow-sm ring-1 ring-white/10"
                        />
                    </motion.div>

                    {/* CONTENT A: GALLERY */}
                    <motion.div 
                        className="absolute inset-[10px] bg-white rounded-[inherit] overflow-hidden flex flex-col"
                        style={{ opacity: galleryOpacity }}
                    >
                         {/* Header */}
                         <div className="h-14 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-gray-100">
                            <h2 className="font-bold text-xl text-black tracking-tight">Gallery</h2>
                            <button className="text-white text-xs font-bold px-4 py-2 bg-black rounded-full shadow-lg hover:scale-105 transition-transform">Add Photo</button>
                         </div>
                         {/* Grid */}
                         <div className="p-4 grid grid-cols-3 gap-3 overflow-hidden bg-gray-50 h-full">
                            {[...Array(12)].map((_, i) => (
                                <div key={i} className="aspect-square bg-white rounded-2xl relative overflow-hidden shadow-sm group border border-gray-100">
                                     <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-blue-50 opacity-50" />
                                     <div className="absolute inset-0 flex items-center justify-center transition-all group-hover:scale-110">
                                        <Lock size={16} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                                     </div>
                                </div>
                            ))}
                         </div>
                    </motion.div>

                    {/* CONTENT B: VIDEO PLAYER */}
                    <motion.div
                        className="absolute inset-0 bg-black flex items-center justify-center z-20"
                        style={{ opacity: videoOpacity }}
                    >
                        <div className="w-full h-full relative flex items-center justify-center bg-black group">
                             <video 
                                src="/demo-video.mp4" 
                                className="w-full h-full object-contain"
                                autoPlay 
                                muted={isMuted}
                                loop 
                                playsInline 
                             />
                             <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsMuted(!isMuted);
                                }}
                                className="absolute bottom-6 left-6 p-3 bg-white/90 backdrop-blur-xl rounded-full text-black shadow-lg hover:bg-white hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center border border-gray-100"
                             >
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                             </button>
                        </div>
                    </motion.div>

                    {/* CONTENT C: LOCKED BACKGROUND */}
                    <motion.div
                        className="absolute inset-0 bg-black/95 z-30 flex items-center justify-center backdrop-blur-xl"
                        style={{ opacity: useTransform(smoothProgress, [0.65, 0.75], [0, 1]) }}
                    >
                        <div className="flex flex-col items-center">
                            <Lock size={64} className="text-gray-800 mb-4" />
                            <p className="text-gray-800 font-syne font-bold text-2xl uppercase tracking-widest">Secure</p>
                        </div>
                    </motion.div>
                
                </motion.div> {/* End Morphing Container */}


                {/* 2. EXPLODING TILES (Foreground) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                    {tiles.map((tile, index) => (
                    <SplitTile
                        key={index}
                        index={index}
                        isActive={splitActiveState}
                        imageUrl={tile.imageUrl}
                        title={tile.title}
                        description={tile.description}
                        bullet={tile.bullet}
                        icon={tile.icon}
                        delay={index * 0.05}
                        isMobile={isMobile}
                    />
                    ))}
                </div>

            </motion.div>

            {/* Scroll Indicator */}
            <motion.div 
                style={{ opacity: heroOpacity }}
                className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
            >
                <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">Scroll</span>
                <ChevronDown className="w-5 h-5 text-gray-400 animate-bounce" />
            </motion.div>

        </div>
      </div>
    </div>
  );
}
