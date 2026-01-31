"use client";

import { motion } from "framer-motion";
import { EyeOff, AlertTriangle, ShieldAlert } from "lucide-react";

const features = [
  {
    icon: <EyeOff className="w-8 h-8 text-blue-500" />,
    title: "Zero-Trace Capture",
    status: "In Development",
    description: "Bypasses the disk completely. Photos go straight from sensor to RAM to Encryption. No forensic trace left behind."
  },
  {
    icon: <AlertTriangle className="w-8 h-8 text-red-500" />,
    title: "Panic Button",
    status: "Prototype",
    description: "Shake your device to instantly wipe all local keys and cache. Designed for checkpoints and seizure scenarios."
  },
  {
    icon: <ShieldAlert className="w-8 h-8 text-amber-500" />,
    title: "Decoy Accounts",
    status: "Research Phase",
    description: "Duress PINs that unlock a harmless 'fake' gallery. Plausible deniability when silence is not an option."
  }
];

export default function VisionSection() {
  return (
    <section className="py-24 bg-white text-black relative overflow-hidden border-t border-gray-100">
      {/* Background Noise/Grid - Subtle for Light Mode */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:16px_16px]"></div>
      
      <div className="max-w-[1280px] mx-auto px-6 lg:px-20 relative z-10">
        <div className="mb-16 text-center lg:text-left">
          <h2 className="text-sm font-mono text-blue-600 mb-4 tracking-widest uppercase font-bold">
            // The Roadmap
          </h2>
          <h3 className="text-3xl lg:text-5xl font-bold mb-6 text-gray-900">
            Future-Proofing Your Safety
          </h3>
          <p className="text-gray-500 max-w-2xl text-lg leading-relaxed">
            We are building tools that anticipate the threats of tomorrow. Browse the specs below and <strong>vote on what we build next</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, idx) => {
            const linkMap: Record<string, string> = {
                "Zero-Trace Capture": "/features/secure-drop",
                "Panic Button": "/features/panic-button",
                "Decoy Accounts": "/features/decoy-accounts"
            };
            
            return (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className="bg-gray-50 border border-gray-100 p-8 rounded-2xl hover:border-blue-200 hover:shadow-lg transition-all group relative"
            >
              <div className="absolute top-6 right-6">
                 <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${
                    feature.status === 'In Development' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                    feature.status === 'Prototype' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                    'bg-gray-100 text-gray-600 border-gray-200'
                 }`}>
                  {feature.status}
                </span>
              </div>

              <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100 w-fit group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              
              <h4 className="text-xl font-bold mb-3 text-gray-900">{feature.title}</h4>
              <p className="text-gray-500 leading-relaxed text-sm mb-6">
                {feature.description}
              </p>
              
              <a href={linkMap[feature.title] || "#"} className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
                  View Specs & Feedback <span className="ml-1">→</span>
              </a>
            </motion.div>
          )})}
        </div>

        <div className="mt-16 p-8 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Want to shape these features?</h4>
            <p className="text-gray-500 text-sm">Join the closed beta to vote on the implementation of the Panic Button.</p>
          </div>
          <a 
            href="mailto:beta@saecretheaven.com?subject=Beta%20Access%20Request"
            className="px-6 py-3 bg-black hover:bg-gray-800 text-white font-bold rounded-lg transition-colors whitespace-nowrap shadow-lg"
          >
            Apply for Access
          </a>
        </div>
      </div>
    </section>
  );
}
