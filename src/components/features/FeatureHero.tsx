"use client";

import { motion } from "framer-motion";

interface FeatureHeroProps {
  title: string;
  subtitle: string;
  description: string;
  status: "Live Protocol" | "In Development" | "Prototype" | "Research Phase";
  icon: React.ReactNode;
}

export default function FeatureHero({ title, subtitle, description, status, icon }: FeatureHeroProps) {
  const statusStyles = {
    "Live Protocol": "bg-green-100 text-green-700 border-green-200",
    "In Development": "bg-blue-100 text-blue-700 border-blue-200",
    "Prototype": "bg-amber-100 text-amber-700 border-amber-200",
    "Research Phase": "bg-gray-100 text-gray-600 border-gray-200"
  };

  return (
    <section className="py-24 lg:py-32 bg-white text-black border-b border-gray-100">
      <div className="max-w-[1280px] mx-auto px-8 lg:px-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Icon */}
          <div className="mb-6 mx-auto p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-100 w-fit">
            <div className="text-blue-600">
              {icon}
            </div>
          </div>

          {/* Status Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mb-6"
          >
            <span className={`inline-block text-[10px] uppercase font-bold px-3 py-1.5 rounded border ${statusStyles[status]}`}>
              {status}
            </span>
          </motion.div>

          {/* Title */}
          <h1 className="font-space-grotesk text-[48px] lg:text-[72px] font-bold text-gray-900 mb-4 leading-tight">
            {title}
          </h1>

          {/* Subtitle */}
          <p className="font-space-grotesk text-xl lg:text-2xl text-gray-700 mb-6 font-semibold">
            {subtitle}
          </p>

          {/* Description */}
          <p className="font-inter text-base lg:text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">
            {description}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
