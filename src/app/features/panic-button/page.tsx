"use client";

import { AlertTriangle, Smartphone, Zap, Trash2 } from "lucide-react";
import FeaturePageLayout from "@/components/features/FeaturePageLayout";
import FeatureHero from "@/components/features/FeatureHero";
import TechSpecCard from "@/components/features/TechSpecCard";
import FeedbackButton from "@/components/features/FeedbackButton";
import { motion } from "framer-motion";

export default function PanicButtonPage() {
  return (
    <FeaturePageLayout>
      <FeatureHero
        title="SCORCHED EARTH"
        subtitle="Emergency Key Wipe Protocol"
        description="Designed for device seizure scenarios. Shake your phone to instantly destroy all encryption keys and render your vault mathematically unrecoverable."
        status="In Development"
        icon={<AlertTriangle className="w-8 h-8" />}
      />

      {/* Threat Model Section */}
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
              When Silence Isn't an Option
            </h2>
            <p className="font-inter text-lg text-gray-600 mb-12 text-center leading-relaxed">
              The Panic Button is designed for extreme scenarios where your unlocked device is about to fall into hostile hands.
            </p>

            {/* Threat Scenarios */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {[
                {
                  title: "Border Crossing",
                  description: "Forced biometric unlock at checkpoints with active device inspection."
                },
                {
                  title: "Protest Arrest",
                  description: "Device seized while unlocked during sudden arrest scenarios."
                },
                {
                  title: "Compelled Access",
                  description: "Legal or illegal demands to provide access to your data."
                }
              ].map((scenario, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="bg-white p-6 rounded-lg border border-gray-200"
                >
                  <h3 className="font-space-grotesk text-lg font-semibold text-gray-900 mb-2">
                    {scenario.title}
                  </h3>
                  <p className="font-inter text-sm text-gray-600 leading-relaxed">
                    {scenario.description}
                  </p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="bg-red-50 border border-red-200 p-6 rounded-lg text-center"
            >
              <p className="font-inter text-base text-red-900 font-semibold">
                "If they have your device unlocked, your keys are vulnerable."
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Trigger Mechanisms Section */}
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
              Trigger Mechanisms
            </h2>
            <p className="font-inter text-lg text-gray-600 mb-12 text-center leading-relaxed">
              Multiple ways to activate the Panic Button, designed for accessibility under extreme stress.
            </p>

            <div className="space-y-6">
              {[
                {
                  icon: <Smartphone className="w-6 h-6" />,
                  title: "Shake to Nuke (Motion Trigger)",
                  api: "DeviceMotionEvent (Web API)",
                  description: "Detect rapid acceleration (> 15m/s²) across multiple axes within a 500ms window (e.g., violent shaking).",
                  safety: "Requires 'Arming' mode to be active (e.g., user enters 'High Risk Mode' before a protest). This prevents accidental wipes during normal use."
                },
                {
                  icon: <Zap className="w-6 h-6" />,
                  title: "Triple Tap (UI Trigger)",
                  api: "Touch Event Handler",
                  description: "A floating action button (hidden or subtle) that requires a specific gesture sequence (e.g., Triple Tap RED area).",
                  safety: "Haptic vibration (using navigator.vibrate) to confirm trigger acceptance without looking."
                },
                {
                  icon: <Trash2 className="w-6 h-6" />,
                  title: "LockDown Notification (Background Hack)",
                  api: "Service Worker + Notifications API",
                  description: "App pushes a persistent 'System Status: OK' notification. If the user taps this notification twice or interacts with a specific action button ('CLEAR'), it triggers the wipe service worker.",
                  safety: "Works even when app is backgrounded. Provides plausible deniability."
                }
              ].map((trigger, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="bg-gray-50 p-6 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                      {trigger.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-space-grotesk text-lg font-semibold text-gray-900 mb-1">
                        {trigger.title}
                      </h3>
                      <p className="font-mono text-xs text-blue-600 mb-3">
                        {trigger.api}
                      </p>
                      <p className="font-inter text-sm text-gray-600 mb-3 leading-relaxed">
                        {trigger.description}
                      </p>
                      <p className="font-inter text-xs text-gray-500 italic">
                        Safety: {trigger.safety}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* The Nuke Protocol Section */}
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
              The Nuke Protocol
            </h2>
            <p className="font-inter text-lg text-gray-600 mb-12 text-center leading-relaxed">
              When triggered, the app executes these <strong>synchronous</strong> operations in under 500ms:
            </p>

            {/* Protocol Steps */}
            <div className="space-y-4 mb-12">
              {[
                {
                  step: "1. Drop Encryption Keys",
                  description: "Immediately overwrite the TweetNaCl private key held in memory/sessionStorage with zeros.",
                  code: "sessionStorage.removeItem('vault_key');"
                },
                {
                  step: "2. Wipe Dexie DB",
                  description: "Delete the entire IndexedDB database containing encrypted photos.",
                  code: "await window.indexedDB.deleteDatabase('PrivacyHeavenDB');"
                },
                {
                  step: "3. Clear Storage",
                  description: "Wipe all local storage and session storage.",
                  code: "localStorage.clear();\nsessionStorage.clear();"
                },
                {
                  step: "4. Crash/Reload",
                  description: "Force a window reload to flush application state from RAM.",
                  code: "window.location.href = 'about:blank';"
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="bg-white p-6 rounded-lg border border-gray-200"
                >
                  <h3 className="font-space-grotesk text-base font-semibold text-gray-900 mb-2">
                    {item.step}
                  </h3>
                  <p className="font-inter text-sm text-gray-600 mb-3 leading-relaxed">
                    {item.description}
                  </p>
                  <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono overflow-x-auto">
                    {item.code}
                  </pre>
                </motion.div>
              ))}
            </div>

            {/* Technical Specs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TechSpecCard
                title="Current Implementation"
                variant="current"
                specs={[
                  { label: "Trigger", value: "Shake gesture (3 rapid shakes)" },
                  { label: "Wipe Target", value: "localStorage keys, IndexedDB" },
                  { label: "Time", value: "< 500ms" },
                  { label: "Confirmation", value: "2-second hold required" }
                ]}
              />
              <TechSpecCard
                title="Planned Enhancements"
                variant="planned"
                specs={[
                  { label: "RAM Wipe", value: "Volatile memory clearing (Tauri desktop only)" },
                  { label: "Duress PIN", value: "Fake vault unlocks with decoy photos" },
                  { label: "Remote Trigger", value: "SMS or web trigger (optional)" }
                ]}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Security Considerations Section */}
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
              Security Considerations
            </h2>

            <div className="space-y-6 mb-12">
              <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg">
                <h3 className="font-space-grotesk text-lg font-semibold text-amber-900 mb-2">
                  False Positives
                </h3>
                <p className="font-inter text-sm text-amber-800 leading-relaxed">
                  Accidental triggers are prevented by requiring "High Risk Mode" activation. This mode must be explicitly enabled before protests or high-risk situations.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                <h3 className="font-space-grotesk text-lg font-semibold text-blue-900 mb-2">
                  Recovery
                </h3>
                <p className="font-inter text-sm text-blue-800 leading-relaxed">
                  Once the Panic Button is triggered, your vault is <strong>IRREVERSIBLY DESTROYED</strong> on that device. The only recovery method is your 12-word recovery phrase, which must be stored safely offline.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
                <h3 className="font-space-grotesk text-lg font-semibold text-green-900 mb-2">
                  Legal Protection
                </h3>
                <p className="font-inter text-sm text-green-800 leading-relaxed">
                  You cannot be compelled to provide keys that no longer exist. The Panic Button provides cryptographic proof of data destruction.
                </p>
              </div>
            </div>

            {/* Implementation Roadmap */}
            <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
              <h3 className="font-space-grotesk text-xl font-semibold text-gray-900 mb-4">
                Implementation Roadmap
              </h3>
              <ul className="space-y-3">
                {[
                  "Create usePanicSensor hook using DeviceMotion",
                  "Implement NukeService.ts (the cleanup logic)",
                  "Add 'High Risk Mode' toggle in settings to enable the sensors",
                  "Test RAM wipe on Tauri desktop builds",
                  "Security audit for timing attacks and recovery vulnerabilities"
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
      <section className="py-16 bg-gray-50 border-t border-gray-100">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h3 className="font-space-grotesk text-2xl font-semibold text-gray-900 mb-4">
              Help Shape This Feature
            </h3>
            <p className="font-inter text-base text-gray-600 mb-6 leading-relaxed">
              Would you use the Panic Button? What triggers make sense for your threat model? Which safety mechanisms are most important?
            </p>
            <FeedbackButton
              featureName="Panic Button"
              question="Would you use this? Suggest triggers"
              className="text-sm px-6 py-3"
            />
          </motion.div>
        </div>
      </section>
    </FeaturePageLayout>
  );
}
