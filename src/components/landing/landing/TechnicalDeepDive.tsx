"use client";

import { motion } from "framer-motion";
import { Lock, Upload, Server, Key, ShieldCheck, Smartphone, Globe, FileKey } from "lucide-react";

const steps = [
  {
    icon: <Smartphone className="w-8 h-8 text-blue-600" />,
    title: "1. Client-Side Capture",
    desc: "Your photo is captured and immediately processed within your device's isolated memory.",
    detail: "Sandbox Environment",
    color: "bg-blue-50 text-blue-700"
  },
  {
    icon: <FileKey className="w-8 h-8 text-blue-700" />,
    title: "2. Zero-Knowledge Encryption",
    desc: "Before leaving your phone, the file is encrypted using XSalsa20-Poly1305.",
    detail: "You hold the only key",
    color: "bg-blue-50 text-blue-800"
  },
  {
    icon: <Upload className="w-8 h-8 text-blue-800" />,
    title: "3. Sharded Upload",
    desc: "The encrypted blob is split into chunks and distributed across the IPFS network.",
    detail: "Decentralized Storage",
    color: "bg-gray-100 text-blue-900"
  },
  {
    icon: <ShieldCheck className="w-8 h-8 text-black" />,
    title: "4. Secure Retrieval",
    desc: "To view, your device downloads the chunks and decrypts them locally using your private key.",
    detail: "End-to-End Encrypted",
    color: "bg-gray-50 text-black"
  }
];

export default function TechnicalDeepDive() {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Background Tech Elements */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full mb-4">
              <span className="text-xs font-semibold text-gray-600 tracking-wide uppercase">Under the Hood</span>
          </div>
          <h2 className="text-3xl lg:text-5xl font-bold font-syne text-gray-900 mb-6">
            Trusted Architecture.<br/>
            <span className="text-blue-700">Verified Security.</span>
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            We don't just say "it's secure." We built a zero-knowledge pipeline where the server literally cannot read your data. Here is the flow.
          </p>
        </div>

        {/* The Flow Diagram */}
        <div className="relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden lg:block absolute top-[60px] left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-blue-300 to-gray-300 z-0" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
                {steps.map((step, idx) => (
                    <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1, duration: 0.5 }}
                        viewport={{ once: true }}
                        className="relative z-10 flex flex-col items-center text-center"
                    >
                        {/* Icon Bubble */}
                        <div className={`w-24 h-24 rounded-3xl ${step.color} flex items-center justify-center mb-8 shadow-xl shadow-gray-200/50 hover:scale-110 transition-transform duration-300 bg-white border-4 border-white ring-1 ring-gray-100`}>
                            {step.icon}
                        </div>
                        
                        {/* Content */}
                        <h3 className="text-xl font-bold text-gray-900 mb-3 font-syne">{step.title}</h3>
                        <p className="text-gray-600 text-sm leading-relaxed mb-4 min-h-[60px]">
                            {step.desc}
                        </p>
                        
                        {/* Detail Tag */}
                        <div className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg">
                            <code className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{step.detail}</code>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>

        {/* Technical Stats / Trust Indicators */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-center border-t border-gray-100 pt-16">
            <div>
                <div className="text-4xl font-bold text-gray-900 mb-2 font-syne">AES-256</div>
                <div className="text-sm text-gray-500 uppercase tracking-widest font-semibold">Encryption Strength</div>
            </div>
            <div>
                <div className="text-4xl font-bold text-gray-900 mb-2 font-syne">0.00%</div>
                <div className="text-sm text-gray-500 uppercase tracking-widest font-semibold">Server-Side Visibility</div>
            </div>
              <div>
                <div className="text-4xl font-bold text-gray-900 mb-2 font-syne">100%</div>
                <div className="text-sm text-gray-500 uppercase tracking-widest font-semibold">User Ownership</div>
            </div>
        </div>

      </div>
    </section>
  );
}
