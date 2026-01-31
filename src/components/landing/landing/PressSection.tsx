"use client";

import { motion } from "framer-motion";

// Since we don't have SVG assets for specific companies yet, we'll use text or generic representations 
// or simpler "Built With" style validation for now, which is common for dev/privacy tools.
const techStack = [
  { name: "Tauri", label: "Auditable Builds" },
  { name: "Supabase", label: "Secure Storage" },
  { name: "Next.js", label: "Modern React" },
  { name: "Signal Proto", label: "Encryption" },
  { name: "Argon2", label: "Hashing" },
];

export default function PressSection() {
  return (
    <section className="py-10 overflow-hidden bg-black/40 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-gray-500 text-xs font-semibold uppercase tracking-widest mb-8">
          Built on Battle-Tested Technology
        </p>
        
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
           {techStack.map((tech, i) => (
             <motion.div 
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center gap-2 group cursor-default"
             >
                <span className="text-xl md:text-2xl font-bold font-space-grotesk text-gray-400 group-hover:text-white transition-colors">
                  {tech.name}
                </span>
                <span className="text-[10px] text-gray-600 bg-gray-900/50 px-2 py-0.5 rounded-full border border-gray-800">
                    {tech.label}
                </span>
             </motion.div>
           ))}
        </div>
      </div>
    </section>
  );
}
