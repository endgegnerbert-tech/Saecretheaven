"use client";

import { motion } from "framer-motion";
import { ShieldCheck, EyeOff, Lock, FileCode, ServerOff, Globe } from "lucide-react";

const badges = [
  {
    icon: ShieldCheck,
    title: "Audited Crypto",
    description: "Uses industry-standard TweetNaCl & Argos2."
  },
  {
    icon: EyeOff,
    title: "Zero Knowledge",
    description: "We cannot see your data. Only you have the keys."
  },
  {
    icon: ServerOff,
    title: "RAM-Only Mode",
    description: "Data exists only in memory until explicitly saved."
  },
  {
    icon: FileCode,
    title: "100% Open Source",
    description: "Codebase publicly variable on GitHub."
  },
];

export default function SecurityBadges() {
  return (
    <section className="py-12 border-y border-white/5 bg-black/20 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 lg:px-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {badges.map((badge, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="flex flex-col items-center text-center group"
            >
              <div className="mb-4 p-3 rounded-full bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-colors">
                <badge.icon size={24} />
              </div>
              <h3 className="text-white font-semibold mb-1 text-sm md:text-base">
                {badge.title}
              </h3>
              <p className="text-gray-400 text-xs md:text-sm leading-relaxed max-w-[200px]">
                {badge.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
