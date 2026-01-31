import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Upload, Lock, Cloud, Download, EyeOff } from "lucide-react";

export default function TechnicalAccordion() {
  const technicalDetails = [
    {
      title: "1. Encryption Pipeline (Current)",
      content: (
        <div className="space-y-4">
           {/* Now vs Future Comparison */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                    <span className="text-xs font-bold text-green-600 uppercase tracking-widest block mb-2">LIVE PROTOCOL</span>
                    <ul className="space-y-2">
                        <li className="text-xs text-gray-600"><strong>Algo:</strong> XSalsa20-Poly1305 (TweetNaCl)</li>
                        <li className="text-xs text-gray-600"><strong>Keys:</strong> WebCrypto API (Local)</li>
                        <li className="text-xs text-gray-600"><strong>Storage:</strong> IndexedDB (Encrypted)</li>
                    </ul>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 opacity-80">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block mb-1">RESEARCH / NEXT</span>
                    <ul className="space-y-2">
                        <li className="text-xs text-gray-500"><strong>Padding:</strong> Fixed-size chunking (Anti-traffic analysis)</li>
                        <li className="text-xs text-gray-500"><strong>Quantum:</strong> Dilithium Sig (Experimental)</li>
                    </ul>
                </div>
            </div>

          <div>
            <h4 className="font-syne text-base font-bold text-gray-900 mb-2">
              Why XSalsa20?
            </h4>
            <p className="font-inter text-sm text-gray-500 leading-relaxed mb-4">
              We use <strong>TweetNaCl.js</strong>, a verified constant-time cryptographic library. Unlike AES-GCM, which can be vulnerable to side-channel attacks in some browser implementations, Salsa20 is immune to cache-timing attacks by design.
            </p>
            <div className="flex items-center gap-4 mt-6">
                <a href="/features/panic-button" className="text-xs font-bold text-blue-600 hover:underline hover:text-blue-800 transition-colors">
                    Read Security Whitepaper →
                </a>
                <button className="text-xs font-bold text-gray-400 hover:text-black border border-gray-200 px-3 py-1.5 rounded-md hover:border-gray-400 transition-colors">
                    Give Feedback
                </button>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "2. Data Authenticity (C2PA)",
      content: (
        <div className="space-y-4">
             <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-4">
                <span className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">
                    <Cloud className="w-3 h-3" /> IN DEVELOPMENT
                </span>
                <p className="text-xs text-blue-900/80">
                    The "Authenticity Proof" module is currently focused on <strong>Metadata Stripping</strong>. Full C2PA signature support is scheduled for Q3.
                </p>
            </div>

          <div>
             <h4 className="font-space-grotesk text-base font-semibold text-charcoal mb-2">
              The "Photoshop Problem"
            </h4>
            <p className="font-inter text-sm text-warm-gray leading-relaxed mb-4">
              Journalists strip EXIF data to protect sources, but this makes the image impossible to verify. 
            </p>
            <h4 className="font-space-grotesk text-base font-semibold text-charcoal mb-2">
              Our Solution (Planned)
            </h4>
            <p className="font-inter text-sm text-warm-gray leading-relaxed mb-4">
              We cryptographically sign the <strong>image hash + original metadata</strong> before stripping it. This allows you to publish a clean image publicly, while retaining a private mathematical proof that the image was not doctored.
            </p>
             <div className="flex items-center gap-4 mt-2">
                <a href="/features/metadata-removal" className="text-xs font-bold text-blue-600 hover:underline hover:text-blue-800 transition-colors">
                    View Specs & Research →
                </a>
                <button className="text-xs font-bold text-gray-400 hover:text-black border border-gray-200 px-3 py-1.5 rounded-md hover:border-gray-400 transition-colors">
                    Give Feedback
                </button>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "3. Threat Model: Seizure",
      content: (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
               <div>
                  <h5 className="font-bold text-xs text-gray-900 uppercase mb-2">Current Protection</h5>
                  <p className="text-xs text-gray-500">If device is seized unlocked, attackers can see the app. We rely on the OS sandbox.</p>
               </div>
               <div>
                  <h5 className="font-bold text-xs text-blue-800 uppercase mb-2">Vision Benefit</h5>
                  <p className="text-xs text-blue-600">"Panic Button" will wipe the encryption keys from RAM. Even if the app is open, the data becomes garbage.</p>
               </div>
            </div>
             <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                <a href="/features/panic-button" className="text-xs font-bold text-blue-600 hover:underline hover:text-blue-800 transition-colors">
                    Full Threat Model Analysis →
                </a>
                 <button className="text-xs font-bold text-gray-400 hover:text-black border border-gray-200 px-3 py-1.5 rounded-md hover:border-gray-400 transition-colors">
                    Give Feedback
                </button>
            </div>
        </div>
      )
    },
    {
      title: "4. Secure Drop (Zero-Trace)",
      content: (
        <div className="space-y-4">
             <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-4">
                <span className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">
                    <EyeOff className="w-3 h-3" /> IN DEVELOPMENT
                </span>
                <p className="text-xs text-blue-900/80">
                    Anonymous source uploads without forensic trace. Photos processed entirely in RAM, never touching disk.
                </p>
            </div>

          <div>
             <h4 className="font-space-grotesk text-base font-semibold text-charcoal mb-2">
              The Forensic Problem
            </h4>
            <p className="font-inter text-sm text-warm-gray leading-relaxed mb-4">
              Standard workflows save photos to disk where they remain recoverable by forensic tools like Cellebrite, even after deletion.
            </p>
            <h4 className="font-space-grotesk text-base font-semibold text-charcoal mb-2">
              Zero-Trace Solution
            </h4>
            <p className="font-inter text-sm text-warm-gray leading-relaxed mb-4">
              We use WebRTC getUserMedia to stream directly from camera to RAM. Photos are encrypted immediately using the journalist's public key, uploaded to IPFS, then the page reloads to flush all memory.
            </p>
             <div className="flex items-center gap-4 mt-2">
                <a href="/features/secure-drop" className="text-xs font-bold text-blue-600 hover:underline hover:text-blue-800 transition-colors">
                    View Technical Specs →
                </a>
                <button className="text-xs font-bold text-gray-400 hover:text-black border border-gray-200 px-3 py-1.5 rounded-md hover:border-gray-400 transition-colors">
                    Give Feedback
                </button>
            </div>
          </div>
        </div>
      )
    }
  ];

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });

  return (
    <section id="technical" ref={ref} className="scroll-mt-20 py-32 lg:py-40 bg-white border-t border-gray-100">
      <div className="max-w-[1280px] mx-auto px-8 lg:px-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 lg:mb-16"
        >
          <h2 className="font-space-grotesk text-[36px] lg:text-[48px] font-semibold text-charcoal mb-4">
            Current Architecture
          </h2>
          <p className="font-inter text-lg lg:text-xl text-warm-gray max-w-2xl mx-auto">
            The technology protecting your data <strong>today</strong>.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {technicalDetails.map((detail, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <AccordionItem 
                  value={`item-${index}`}
                  className="bg-white rounded-2xl overflow-hidden border-none"
                  style={{
                    boxShadow: '0 4px 24px rgba(102, 126, 234, 0.08)',
                  }}
                >
                  <AccordionTrigger className="px-6 lg:px-8 py-5 lg:py-6 hover:no-underline hover:bg-gray-50/50 transition-colors">
                    <span className="font-space-grotesk text-lg lg:text-xl font-semibold text-charcoal text-left">
                      {detail.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 lg:px-8 pb-5 lg:pb-6">
                    {detail.content}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
