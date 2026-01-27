import { Check, X, AlertCircle } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export default function ComparisonTable() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });

  const features = [
    { 
      name: "E2E Encryption (default)", 
      privacyHaven: { value: true, label: "Always on" }, 
      others: { value: false, label: "Opt-in / None" } 
    },
    { 
      name: "Zero-knowledge", 
      privacyHaven: { value: true, label: "By design" }, 
      others: { value: false, label: "Company has keys" } 
    },
    { 
      name: "Server decrypts", 
      privacyHaven: { value: true, label: "Never" }, 
      others: { value: false, label: "Always" } 
    },
    { 
      name: "IPFS redundancy", 
      privacyHaven: { value: true, label: "Multi-node EU" }, 
      others: { value: false, label: "Single cloud" } 
    },
    { 
      name: "Offline PWA", 
      privacyHaven: { value: true, label: "Full offline" }, 
      others: { value: "partial", label: "Limited" } 
    },
    { 
      name: "Client-Side Encryption", 
      privacyHaven: { value: true, label: "100% local" }, 
      others: { value: false, label: "Server-side" } 
    },
    { 
      name: "Open Source Roadmap", 
      privacyHaven: { value: true, label: "Planned" }, 
      others: { value: false, label: "No" } 
    },
    { 
      name: "GDPR Compliant", 
      privacyHaven: { value: true, label: "Full compliance" }, 
      others: { value: "partial", label: "Varies" } 
    },
  ];

  const renderValue = (item: { value: boolean | string; label: string }, isPrivacyHaven: boolean) => {
    if (item.value === true) {
      return (
        <div className="flex flex-col items-center gap-1">
          <Check className={`${isPrivacyHaven ? 'text-success-green' : 'text-success-green'}`} size={22} strokeWidth={3} />
          <span className={`text-xs ${isPrivacyHaven ? 'text-success-green' : 'text-warm-gray'} font-medium`}>
            {item.label}
          </span>
        </div>
      );
    } else if (item.value === "partial") {
      return (
        <div className="flex flex-col items-center gap-1">
          <AlertCircle className="text-warning-amber" size={22} strokeWidth={2} />
          <span className="text-xs text-warning-amber font-medium">{item.label}</span>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col items-center gap-1">
          <X className="text-warm-gray/60" size={22} strokeWidth={2} />
          <span className="text-xs text-warm-gray">{item.label}</span>
        </div>
      );
    }
  };

  return (
    <section id="compare" className="scroll-mt-20 py-32 lg:py-40 bg-white">
      <div className="max-w-[1280px] mx-auto px-8 lg:px-20">
        <div className="text-center mb-12 lg:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-space-grotesk text-[36px] lg:text-[48px] font-semibold text-charcoal mb-4">
              PrivacyHaven vs. Others
            </h2>
            <p className="font-inter text-lg lg:text-xl text-warm-gray max-w-2xl mx-auto">
              See how we compare to mainstream cloud storage providers when it comes to your privacy.
            </p>
          </motion.div>
        </div>

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, ease: [0.4, 0.0, 0.2, 1] }}
          className="overflow-hidden rounded-3xl overflow-x-auto"
          style={{
            boxShadow: '0 4px 40px rgba(102, 126, 234, 0.1)',
          }}
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-5 lg:py-6 px-6 lg:px-8 bg-white font-space-grotesk text-base lg:text-lg font-semibold text-charcoal w-2/5">
                  Feature
                </th>
                <th className="py-5 lg:py-6 px-4 lg:px-8 bg-gradient-to-b from-success-green/10 to-success-green/5 font-space-grotesk text-base lg:text-lg font-semibold text-indigo-soft w-[30%]">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 bg-success-green rounded-full" />
                    PrivacyHaven
                  </div>
                </th>
                <th className="py-5 lg:py-6 px-4 lg:px-8 bg-gray-50 font-space-grotesk text-base lg:text-lg font-semibold text-warm-gray w-[30%]">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 bg-warm-gray/40 rounded-full" />
                    Others
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <motion.tr 
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group"
                >
                  <td className="py-4 lg:py-5 px-6 lg:px-8 font-inter text-sm lg:text-base text-charcoal bg-white group-hover:bg-gray-50/50">
                    <span className="font-medium">{feature.name}</span>
                  </td>
                  <td className="py-4 lg:py-5 px-4 lg:px-8 text-center bg-success-green/5 group-hover:bg-success-green/10 transition-colors">
                    {renderValue(feature.privacyHaven, true)}
                  </td>
                  <td className="py-4 lg:py-5 px-4 lg:px-8 text-center bg-gray-50/50 group-hover:bg-gray-100/50 transition-colors">
                    {renderValue(feature.others, false)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Bottom message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center text-sm text-warm-gray mt-8"
        >
          * Comparison based on default settings of major cloud photo storage providers
        </motion.p>
      </div>
    </section>
  );
}
