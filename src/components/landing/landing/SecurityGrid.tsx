import { Lock, FileCheck, AlertTriangle, EyeOff } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface SecurityCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
  link?: string;
}

function SecurityCard({ icon, title, description, index, link }: SecurityCardProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });

  const CardContent = (
    <>
      <div className="absolute top-6 right-6">
        <span className="text-[10px] uppercase font-bold px-2 py-1 rounded border bg-blue-100 text-blue-700 border-blue-200">
          In Development
        </span>
      </div>

      <div className="w-14 h-14 bg-gradient-to-br from-indigo-soft/20 to-violet-gentle/10 rounded-2xl flex items-center justify-center mb-6">
        <div className="text-indigo-soft">
          {icon}
        </div>
      </div>
      <h3 className="font-space-grotesk text-xl lg:text-2xl font-semibold text-charcoal mb-3">
        {title}
      </h3>
      <p className="font-inter text-sm lg:text-base text-warm-gray leading-relaxed mb-4">
        {description}
      </p>

      {link && (
        <div className="inline-flex items-center text-sm font-bold text-blue-600 group-hover:text-blue-800 transition-colors">
          View Details <span className="ml-1 group-hover:ml-2 transition-all">→</span>
        </div>
      )}
    </>
  );

  const commonProps = {
    ref,
    initial: { opacity: 0, y: 40 },
    animate: isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 },
    transition: { duration: 0.6, ease: [0.4, 0.0, 0.2, 1] as any, delay: index * 0.1 },
    whileHover: { y: -4 },
    className: "bg-white rounded-3xl p-8 lg:p-10 cursor-pointer transition-shadow duration-300 block",
    style: {
      boxShadow: '0 4px 24px rgba(102, 126, 234, 0.08)',
    },
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.boxShadow = '0 8px 40px rgba(102, 126, 234, 0.15)';
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.boxShadow = '0 4px 24px rgba(102, 126, 234, 0.08)';
    },
  };

  if (link) {
    return (
      <motion.a href={link} {...commonProps}>
        {CardContent}
      </motion.a>
    );
  }

  return (
    <motion.div {...commonProps}>
      {CardContent}
    </motion.div>
  );
}

export default function SecurityGrid() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });

  const cards = [
    {
      icon: <Lock size={28} strokeWidth={2} />,
      title: "Military-Grade Encryption",
      description: "TweetNaCl with XSalsa20-Poly1305 encryption. Authenticated encryption that ensures your data cannot be tampered with.",
      link: "/features/panic-button"
    },
    {
      icon: <EyeOff size={28} strokeWidth={2} />,
      title: "Zero-Trace Capture",
      description: "Photos never touch the disk. RAM-only processing for anonymous source uploads without forensic trace.",
      link: "/features/secure-drop"
    },
    {
      icon: <FileCheck size={28} strokeWidth={2} />,
      title: "Metadata Removal",
      description: "Strip EXIF data to protect sources while preserving cryptographic proof of authenticity with C2PA.",
      link: "/features/metadata-removal"
    },
    {
      icon: <AlertTriangle size={28} strokeWidth={2} />,
      title: "Panic Button",
      description: "Emergency key wipe protocol. Shake your device to instantly destroy encryption keys during seizure scenarios.",
      link: "/features/panic-button"
    }
  ];

  return (
    <section id="security" ref={ref} className="scroll-mt-20 py-32 lg:py-40 bg-gradient-to-b from-white to-sky-light/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-20 right-10 w-96 h-96 bg-violet-gentle/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-indigo-soft/5 rounded-full blur-3xl" />
      
      <div className="relative max-w-[1280px] mx-auto px-8 lg:px-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 lg:mb-16"
        >
          <h2 className="font-space-grotesk text-[36px] lg:text-[48px] font-semibold text-charcoal mb-4">
            Security Architecture
          </h2>
          <p className="font-inter text-lg lg:text-xl text-warm-gray max-w-2xl mx-auto">
            Built on principles that put your privacy first, always.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {cards.map((card, index) => (
            <SecurityCard key={index} {...card} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
