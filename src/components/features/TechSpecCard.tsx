"use client";

import { motion } from "framer-motion";

interface TechSpec {
  label: string;
  value: string;
}

interface TechSpecCardProps {
  title: string;
  specs: TechSpec[];
  variant?: "current" | "planned";
}

export default function TechSpecCard({ title, specs, variant = "current" }: TechSpecCardProps) {
  const variantStyles = {
    current: {
      bg: "bg-green-50",
      border: "border-green-100",
      badge: "text-green-600",
      text: "text-gray-600"
    },
    planned: {
      bg: "bg-blue-50",
      border: "border-blue-100",
      badge: "text-blue-600",
      text: "text-gray-500"
    }
  };

  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`p-6 ${styles.bg} rounded-lg border ${styles.border}`}
    >
      <span className={`text-xs font-bold ${styles.badge} uppercase tracking-widest block mb-4`}>
        {variant === "current" ? "LIVE PROTOCOL" : "RESEARCH / NEXT"}
      </span>

      {title && (
        <h3 className="font-space-grotesk text-base font-semibold text-gray-900 mb-4">
          {title}
        </h3>
      )}

      <ul className="space-y-3">
        {specs.map((spec, index) => (
          <li key={index} className={`text-sm ${styles.text}`}>
            <strong>{spec.label}:</strong> {spec.value}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
