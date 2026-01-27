import { useState, useRef, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Smartphone, Lock, Cloud, Eye, Play, X, Maximize2 } from "lucide-react";

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
    { x: isMobile ? -100 : -320, y: isMobile ? -260 : -240, rotate: -12 }, // Top Left
    { x: isMobile ? 100 : 320, y: isMobile ? -260 : -240, rotate: 12 },   // Top Right
    { x: isMobile ? -100 : -320, y: isMobile ? 260 : 240, rotate: -6 },   // Bottom Left
    { x: isMobile ? 100 : 320, y: isMobile ? 260 : 240, rotate: 6 },     // Bottom Right
  ];
  
  const pos = tilePositions[index];
  
  return (
    <motion.div
      initial={{ 
        x: 0, 
        y: 0, 
        rotateY: 0,
        rotateX: 0,
        scale: isMobile ? 0.6 : 1,
        opacity: 1 
      }}
      animate={isActive ? {
        x: pos.x,
        y: pos.y,
        rotateY: pos.rotate * 3,
        rotateX: -15,
        scale: isMobile ? 0.75 : 1, // Increased scale

        opacity: 1
      } : {
        x: 0,
        y: 0,
        rotateY: 0,
        rotateX: 0,
        scale: 1,
        opacity: 1
      }}
      transition={{ 
        duration: 0.8, 
        delay: delay,
        ease: [0.4, 0.0, 0.2, 1]
      }}
      // Increased size
      className="absolute w-[200px] h-[320px] origin-center cursor-pointer"
      style={{ 
        perspective: '1000px',
        transformStyle: 'preserve-3d'
      }}
    >
      {/* Card face */}
      <div 
        className="w-full h-full rounded-2xl overflow-hidden relative bg-white border border-gray-100"
        style={{
          boxShadow: isActive 
            ? '0 20px 50px rgba(102, 126, 234, 0.3)' 
            : '0 4px 12px rgba(0, 0, 0, 0.1)',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden'
        }}
      >
        {/* Image portion */}
        <div className="w-full h-3/5 bg-gray-100 overflow-hidden relative">
          <img 
            src={imageUrl} 
            alt={title}
            className="w-full h-full object-cover"
            style={{
              objectPosition: `${index * 25}% 50%`
            }}
          />
          {/* Encryption overlay when active */}
          {isActive && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            />
          )}
        </div>
        
        {/* Info overlay - Simple Card Style */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 p-3 flex flex-col items-center justify-center text-center bg-white">
            <div className="w-8 h-8 rounded-full bg-indigo-soft/10 flex items-center justify-center mb-1">
               <div className="text-indigo-soft scale-75">{icon}</div>
            </div>
            <h4 className="font-space-grotesk text-xs font-bold text-charcoal leading-tight">
               {title}
            </h4>
            {isActive && (
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[10px] text-warm-gray mt-1 leading-tight"
                >
                    {bullet}
                </motion.p>
            )}
        </div>
      </div>
    </motion.div>
  );
}

export default function PhoneSplitAnimation() {
  const [isSplit, setIsSplit] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: "-20%" });

  // Update body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
        document.body.style.overflow = 'unset';
    };
  }, [isFullscreen]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile(); // Initial check
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const tiles = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
      title: "Encrypted on Device",
      description: "Photos are encrypted on your phone before they're uploaded.",
      bullet: "Keys stay with you",
      icon: <Smartphone className="w-5 h-5" />
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
      title: "Military Grade",
      description: "We use XSalsa20-Poly1305 encryption standards.",
      bullet: "Unbreakable Security",
      icon: <Lock className="w-5 h-5" />
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
      title: "Decentralized",
      description: "Stored across multiple secure EU servers (IPFS).",
      bullet: "No Single Point of Failure",
      icon: <Cloud className="w-5 h-5" />
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
      title: "Private by Design",
      description: "We literally cannot see your photos.",
      bullet: "Zero Knowledge",
      icon: <Eye className="w-5 h-5" />
    }
  ];

  const handleInteraction = () => {
    setIsFullscreen(true);
  };

  // ESC key to exit fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFullscreen]);

  return (
    <section 
      id="features"
      ref={ref}
      className={`relative z-10 transition-colors duration-500 scroll-mt-20 ${isFullscreen ? 'bg-black' : 'bg-gradient-to-b from-warm-white to-white py-32'}`}
    >
        {!isFullscreen && (
            <>
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-soft/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-gentle/5 rounded-full blur-3xl" />
            </>
        )}

      <div className={`max-w-[1280px] mx-auto px-8 lg:px-20 ${isFullscreen ? 'h-screen flex flex-col justify-center' : ''}`}>
        {/* Section Header */}
        {!isFullscreen && (
            <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
            >
            <h2 className="font-space-grotesk text-[40px] lg:text-[48px] font-semibold text-charcoal mb-4">
                How Your Photos Stay Protected
            </h2>
            <p className="font-inter text-lg lg:text-xl text-warm-gray max-w-2xl mx-auto">
                Hover to see the encryption process. Click to watch the video.
            </p>
            </motion.div>
        )}

        {/* 3D Split Animation / Fullscreen Area */}
        <div className={`relative flex items-center justify-center ${isFullscreen ? 'fixed inset-0 z-50 bg-black/95' : 'h-[600px]'}`}>
          
          {/* Close Button for Fullscreen - More Visible */}
          {isFullscreen && (
            <button 
                onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }}
                className="absolute top-8 right-8 z-[60] bg-white/90 hover:bg-white rounded-full p-3 transition-all shadow-lg hover:scale-110"
                aria-label="Close fullscreen"
            >
                <X size={24} className="text-gray-900" />
            </button>
          )}

          {/* Central Phone Container */}
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={
                isFullscreen 
                ? { opacity: 1, scale: 1, width: '80vw', height: '45vw', maxWidth: '1200px', maxHeight: '675px', rotateX: 0, rotateY: 0 } // Force 16:9 roughly
                : (isInView ? { opacity: 1, scale: 1, width: 280, height: 560 } : { opacity: 0, scale: 0.9 })
            }
            transition={{ duration: 0.6, type: "spring", damping: 30, stiffness: 100 }}
            onClick={!isFullscreen ? handleInteraction : undefined}
            onMouseEnter={() => !isFullscreen && setIsSplit(true)}
            onMouseLeave={() => !isFullscreen && setIsSplit(false)}
            className={`relative cursor-pointer transition-all ${isFullscreen ? 'max-w-[1200px] max-h-[800px]' : ''}`}
            style={{
              perspective: '1500px',
              transformStyle: 'preserve-3d',
              zIndex: isFullscreen ? 50 : 10,
              willChange: 'transform',
              transform: 'translateZ(0)'
            }}
          >
            {/* Phone Body */}
            <motion.div
              layout
              animate={{
                rotateY: (!isFullscreen && isSplit) ? 0 : (!isFullscreen ? -5 : 0),
                rotateX: (!isFullscreen && isSplit) ? 10 : 0,
                borderRadius: isFullscreen ? 24 : 45
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full h-full bg-black relative shadow-2xl overflow-hidden"
              style={{
                filter: isFullscreen ? 'none' : 'drop-shadow(0 30px 60px rgba(0, 0, 0, 0.25))',
                border: isFullscreen ? 'none' : '12px solid #111',
                willChange: 'transform',
                transform: 'translateZ(0)'
              }}
            >
              {/* Dynamic Island / Notch - Hide in fullscreen */}
              {!isFullscreen && (
                  <>
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black z-30 rounded-b-xl" />
                    {/* Side buttons */}
                    <div className="absolute -left-2 top-28 w-1 h-8 bg-gray-800 rounded-l-lg" />
                    <div className="absolute -left-2 top-40 w-1 h-12 bg-gray-800 rounded-l-lg" />
                    <div className="absolute -right-2 top-36 w-1 h-16 bg-gray-800 rounded-r-lg" />
                  </>
              )}

              {/* Screen Content */}
              <div className={`w-full h-full bg-white overflow-hidden relative ${isFullscreen ? 'rounded-xl' : 'rounded-[36px]'}`}>
                
                {/* VIDEO PLAYER PLACEHOLDER (Visible only in fullscreen) */}
                <AnimatePresence>
                    {isFullscreen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-20 bg-gray-900 flex flex-col items-center justify-center p-8 text-center"
                        >
                            <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center mb-6 animate-pulse">
                                <Play className="w-10 h-10 text-indigo-400 fill-current ml-1" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Demo Video</h3>
                            <p className="text-gray-400 max-w-md">
                                Watch how SaecretHeaven encrypts your photos instantly.
                                (Video asset to be added)
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>


                {/* SPLIT ANIMATION CONTENT (Visible only when NOT fullscreen) */}
                <motion.div 
                    className="absolute inset-0"
                    animate={{ opacity: isFullscreen ? 0 : 1 }}
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* Main image (visible when not split) */}
                    <motion.div
                      animate={{ opacity: isSplit ? 0 : 1 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 z-20"
                    >
                      <img 
                        src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80"
                        alt="Your photo"
                        className="w-full h-full object-cover"
                      />
                    </motion.div>

                    {/* Grid placeholder when split */}
                    <motion.div
                      animate={{ opacity: isSplit ? 1 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 bg-gradient-to-br from-indigo-soft/20 to-violet-gentle/20 flex items-center justify-center -z-10"
                    >
                      <div className="text-center p-4">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-indigo-soft/20 flex items-center justify-center">
                          <Lock className="w-8 h-8 text-indigo-soft" />
                        </div>
                        <p className="text-charcoal font-space-grotesk font-semibold text-sm">Encrypting...</p>
                        <p className="text-warm-gray text-xs mt-1">Splitting into secure tiles</p>
                      </div>
                    </motion.div>

                    {/* The 4 split tiles - Exploding OUTWARDS */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                      {tiles.map((tile, index) => (
                        <SplitTile
                          key={index}
                          index={index}
                          isActive={isSplit}
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

                {/* Persistent Call to Action - Only when NOT fullscreen */}
                {!isFullscreen && (
                  <div className="absolute bottom-6 left-0 right-0 z-40 flex justify-center pointer-events-none">
                       <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center justify-center gap-2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/30 shadow-lg"
                        >
                           <Play size={14} className="text-white fill-white" />
                           <span className="text-white text-xs font-medium tracking-wide">Click to watch video</span>
                        </motion.div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* Info cards positioned AROUND the phone (only visible when split and NOT fullscreen) */}
          <AnimatePresence>
            {isSplit && !isFullscreen && (
              <>
                {tiles.map((tile, index) => {
                    // Calculate positions for floating cards
                    const isLeft = index % 2 === 0;
                    const isTop = index < 2;
                    const xOffset = isLeft ? (isMobile ? -165 : -450) : (isMobile ? 165 : 450); // Distance from center
                    const yOffset = isTop ? (isMobile ? -230 : -200) : (isMobile ? 230 : 200);
                    
                    return (
                      <motion.div
                        key={`info-${index}`}
                        initial={{ opacity: 0, scale: 0.8, x: 0, y: 0 }}
                        animate={{ 
                          opacity: 1, 
                          scale: 1,
                          x: xOffset,
                          y: yOffset
                        }}
                        exit={{ opacity: 0, scale: 0.8, x: 0, y: 0 }}
                        transition={{ 
                          duration: 0.4, 
                          delay: 0.2 + index * 0.1,
                          type: "spring",
                          stiffness: 100
                        }}
                        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-auto"
                        style={{ marginLeft: isMobile ? -100 : -120, marginTop: -60 }} // Center correction
                      >
                        <div 
                          className="w-[240px] p-4 bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100/50 shadow-xl"
                        >
                          <div className="flex items-start gap-3 text-left">
                              <div className="w-10 h-10 rounded-xl bg-indigo-soft/10 flex-shrink-0 flex items-center justify-center">
                                <div className="text-indigo-soft">{tile.icon}</div>
                              </div>
                              <div>
                                <h4 className="font-space-grotesk text-sm font-bold text-charcoal mb-1">
                                    {tile.title}
                                </h4>
                                <p className="text-xs text-warm-gray leading-snug">
                                    {tile.description}
                                </p>
                              </div>
                          </div>
                        </div>
                        
                        {/* Connecting Line (Optional visual flair) */}
                        <svg className="absolute top-1/2 left-1/2 -z-10 overflow-visible" width="0" height="0">
                            <motion.line 
                                x1={isLeft ? 120 : -120} 
                                y1={isTop ? 60 : -60} 
                                x2={isLeft ? 260 : -260} 
                                y2={isTop ? 100 : -100} 
                                stroke="rgba(102, 126, 234, 0.2)" 
                                strokeWidth="2" 
                                strokeDasharray="4 4"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.5, delay: 0.5 }}
                            />
                        </svg>
                      </motion.div>
                    );
                })}
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
