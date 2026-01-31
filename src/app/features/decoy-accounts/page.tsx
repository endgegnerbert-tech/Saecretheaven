"use client";

import { ShieldAlert, Key, Database, Eye } from "lucide-react";
import FeaturePageLayout from "@/components/features/FeaturePageLayout";
import FeatureHero from "@/components/features/FeatureHero";
import TechSpecCard from "@/components/features/TechSpecCard";
import FeedbackButton from "@/components/features/FeedbackButton";
import { motion } from "framer-motion";

export default function DecoyAccountsPage() {
  return (
    <FeaturePageLayout>
      <FeatureHero
        title="Duress Mode"
        subtitle="Plausible Deniability Through Decoy Vaults"
        description="In a 'hostage' scenario where you're forced to unlock your phone, type a special Duress Password that unlocks a harmless, fake gallery instead of your real encrypted vault."
        status="In Development"
        icon={<ShieldAlert className="w-8 h-8" />}
      />

      {/* The Hostage Scenario Section */}
      <section className="py-24 lg:py-32 bg-gray-50">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="font-space-grotesk text-[36px] lg:text-[48px] font-semibold text-gray-900 mb-6 text-center">
              The Hostage Scenario
            </h2>
            <p className="font-inter text-lg text-gray-600 mb-12 text-center leading-relaxed">
              When forced biometric unlock or compelled disclosure makes resistance impossible.
            </p>

            <div className="bg-red-50 border border-red-200 p-8 rounded-lg mb-8">
              <h3 className="font-space-grotesk text-xl font-semibold text-red-900 mb-4">
                Real-World Threat
              </h3>
              <p className="font-inter text-base text-red-800 leading-relaxed mb-4">
                Journalists, activists, and whistleblowers face scenarios where:
              </p>
              <ul className="space-y-2 font-inter text-sm text-red-800">
                <li className="flex items-start gap-2">
                  <span className="text-red-600">•</span>
                  <span>Face ID/Touch ID is used to unlock the device without consent</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600">•</span>
                  <span>Physical coercion or legal threats force password disclosure</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600">•</span>
                  <span>Refusing to unlock triggers immediate detention or worse</span>
                </li>
              </ul>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="bg-blue-50 border border-blue-200 p-6 rounded-lg text-center"
            >
              <p className="font-inter text-base text-blue-900 font-semibold">
                "When silence is not an option, give them what they expect—but not what matters."
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Dual Authentication Section */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="font-space-grotesk text-[36px] lg:text-[48px] font-semibold text-gray-900 mb-6 text-center">
              Dual Authentication System
            </h2>
            <p className="font-inter text-lg text-gray-600 mb-12 text-center leading-relaxed">
              One login screen, two completely different vaults depending on which password you use.
            </p>

            {/* Authentication Flow Diagram */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-green-50 border-2 border-green-200 p-6 rounded-lg"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-200 rounded-lg">
                    <Key className="w-6 h-6 text-green-700" />
                  </div>
                  <h3 className="font-space-grotesk text-lg font-semibold text-green-900">
                    Real Password
                  </h3>
                </div>
                <p className="font-inter text-sm text-green-800 mb-4 leading-relaxed">
                  Your actual password unlocks the real encrypted vault containing your sensitive photos.
                </p>
                <div className="bg-white p-4 rounded border border-green-200">
                  <p className="font-mono text-xs text-green-700">
                    → Decrypts PrivacyHeavenDB_Main
                    <br />→ Shows actual encrypted photos
                    <br />→ Full sync capabilities
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-amber-50 border-2 border-amber-200 p-6 rounded-lg"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-amber-200 rounded-lg">
                    <Eye className="w-6 h-6 text-amber-700" />
                  </div>
                  <h3 className="font-space-grotesk text-lg font-semibold text-amber-900">
                    Duress Password
                  </h3>
                </div>
                <p className="font-inter text-sm text-amber-800 mb-4 leading-relaxed">
                  A separate "distraction password" that unlocks a harmless fake gallery with stock photos.
                </p>
                <div className="bg-white p-4 rounded border border-amber-200">
                  <p className="font-mono text-xs text-amber-700">
                    → Opens sys_cache_01 (decoy DB)
                    <br />→ Shows harmless stock photos
                    <br />→ Upload/sync silently disabled
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Better Auth Integration */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="font-space-grotesk text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                Authentication Logic (Better Auth Plugin)
              </h3>
              <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs font-mono overflow-x-auto">
{`if (verify(inputPassword, user.duress_password_hash)) {
  return createSession({ ...user, isDuress: true });
}
// Session JWT includes claim "mode": "decoy"`}
              </pre>
              <p className="font-inter text-sm text-gray-600 mt-3 leading-relaxed">
                The Better Auth plugin intercepts login to detect which password was used, then sets the session mode accordingly.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Technical Architecture Section */}
      <section className="py-24 lg:py-32 bg-gray-50">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="font-space-grotesk text-[36px] lg:text-[48px] font-semibold text-gray-900 mb-6 text-center">
              Technical Architecture
            </h2>
            <p className="font-inter text-lg text-gray-600 mb-12 text-center leading-relaxed">
              How the dual-database system maintains plausible deniability.
            </p>

            {/* Technical Specs */}
            <div className="grid grid-cols-1 gap-6 mb-12">
              <TechSpecCard
                title="Schema Extensions"
                variant="current"
                specs={[
                  { label: "User table", value: "duress_password_hash, is_duress_active" },
                  { label: "Session state", value: "JWT claim: 'mode': 'decoy'" },
                  { label: "Storage", value: "Dual Dexie.js databases" }
                ]}
              />
            </div>

            {/* Storage Logic */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="font-space-grotesk text-base font-semibold text-gray-900 mb-3">
                  Dual-Database Architecture
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded border border-green-100">
                    <p className="font-mono text-xs text-green-700 mb-2">Real Mode:</p>
                    <p className="font-inter text-sm text-gray-700">
                      Connects to <code className="bg-white px-1 py-0.5 rounded text-xs">PrivacyHeavenDB_Main</code>
                      <br />Encrypted with real key
                    </p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded border border-amber-100">
                    <p className="font-mono text-xs text-amber-700 mb-2">Decoy Mode:</p>
                    <p className="font-inter text-sm text-gray-700">
                      Connects to <code className="bg-white px-1 py-0.5 rounded text-xs">sys_cache_01</code>
                      <br />Unencrypted or encrypted with duress key
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="font-space-grotesk text-base font-semibold text-gray-900 mb-3">
                  State Management
                </h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs font-mono overflow-x-auto">
{`const dbName = session.mode === 'decoy'
  ? 'sys_cache_01'  // Looks like system cache
  : 'secure_vault';

const db = new Dexie(dbName);`}
                </pre>
                <p className="font-inter text-sm text-gray-600 mt-3 leading-relaxed">
                  The decoy database is named to look innocent in browser DevTools inspection.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Populating the Decoy Section */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="font-space-grotesk text-[36px] lg:text-[48px] font-semibold text-gray-900 mb-6 text-center">
              Populating the Decoy
            </h2>
            <p className="font-inter text-lg text-gray-600 mb-12 text-center leading-relaxed">
              An empty app is suspicious. The decoy vault must appear convincingly real.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="bg-gray-50 p-6 rounded-lg border border-gray-200"
              >
                <h3 className="font-space-grotesk text-lg font-semibold text-gray-900 mb-2">
                  Auto-Fill Strategy
                </h3>
                <p className="font-inter text-sm text-gray-600 leading-relaxed">
                  On first decoy access, standard "stock photos" (landscapes, cats, food) are automatically seeded so the gallery isn't empty.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="bg-gray-50 p-6 rounded-lg border border-gray-200"
              >
                <h3 className="font-space-grotesk text-lg font-semibold text-gray-900 mb-2">
                  Safety Mechanisms
                </h3>
                <p className="font-inter text-sm text-gray-600 leading-relaxed">
                  In Decoy Mode, all upload/sync features to the real cloud are silently disabled to prevent data leakage.
                </p>
              </motion.div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg">
              <h3 className="font-space-grotesk text-base font-semibold text-amber-900 mb-2">
                Forensic Considerations
              </h3>
              <ul className="space-y-2 font-inter text-sm text-amber-800">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Database naming: "sys_cache_01" appears less suspicious than "decoy_vault"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Photos must have realistic EXIF data (different dates, locations)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>UI behavior must be identical between real and decoy modes</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Development Tasks Section */}
      <section className="py-24 lg:py-32 bg-gray-50">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="font-space-grotesk text-[36px] lg:text-[48px] font-semibold text-gray-900 mb-6 text-center">
              Development Roadmap
            </h2>

            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <ul className="space-y-3">
                {[
                  "Extend Better Auth schema with duress_password_hash field",
                  "Create DuressAuthPlugin to intercept login flow",
                  "Refactor db.ts to accept dynamic database names",
                  "Build stock photo seeding system for decoy vault",
                  "Implement silent feature disabling in decoy mode",
                  "Security audit: timing attacks, database leakage vectors",
                  "User testing: measure plausibility of decoy content"
                ].map((task, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold">-</span>
                    <span className="font-inter text-sm text-gray-700">{task}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feedback CTA Section */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h3 className="font-space-grotesk text-2xl font-semibold text-gray-900 mb-4">
              Shape the Decoy Experience
            </h3>
            <p className="font-inter text-base text-gray-600 mb-6 leading-relaxed">
              What should the decoy vault contain? How many photos? What subjects? Should it include fake messages or notes?
            </p>
            <FeedbackButton
              featureName="Decoy Accounts"
              question="What should the decoy contain?"
              className="text-sm px-6 py-3"
            />
          </motion.div>
        </div>
      </section>
    </FeaturePageLayout>
  );
}
