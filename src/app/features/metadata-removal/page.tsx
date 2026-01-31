"use client";

import { FileCheck, MapPin, Smartphone, Shield, CheckCircle } from "lucide-react";
import FeaturePageLayout from "@/components/features/FeaturePageLayout";
import FeatureHero from "@/components/features/FeatureHero";
import TechSpecCard from "@/components/features/TechSpecCard";
import FeedbackButton from "@/components/features/FeedbackButton";
import { motion } from "framer-motion";

export default function MetadataRemovalPage() {
  return (
    <FeaturePageLayout>
      <FeatureHero
        title="The End of Metadata"
        subtitle="Protect Sources, Prove Authenticity"
        description="Strip EXIF data to protect your safety, while preserving a cryptographic proof of authenticity for editors and courts."
        status="In Development"
        icon={<FileCheck className="w-8 h-8" />}
      />

      {/* The Journalist's Dilemma Section */}
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
              The Journalist's Dilemma
            </h2>
            <p className="font-inter text-lg text-gray-600 mb-12 text-center leading-relaxed">
              Every photo contains hidden data that can reveal where, when, and how it was taken. The dilemma: protect sources or prove authenticity?
            </p>

            {/* The Two Sides */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-white p-6 rounded-lg border-2 border-amber-200"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <MapPin className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="font-space-grotesk text-lg font-semibold text-amber-900">
                    Strip Metadata
                  </h3>
                </div>
                <p className="font-inter text-sm text-gray-700 mb-3 leading-relaxed">
                  Remove GPS coordinates, device serial numbers, and timestamps to protect sources from identification.
                </p>
                <p className="font-inter text-xs text-amber-700 font-semibold">
                  Risk: Cannot prove the photo wasn't doctored or AI-generated.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-white p-6 rounded-lg border-2 border-blue-200"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-space-grotesk text-lg font-semibold text-blue-900">
                    Preserve Metadata
                  </h3>
                </div>
                <p className="font-inter text-sm text-gray-700 mb-3 leading-relaxed">
                  Keep EXIF data to provide courts and editors with proof of authenticity, location, and capture device.
                </p>
                <p className="font-inter text-xs text-blue-700 font-semibold">
                  Risk: GPS reveals source location. Device serial number enables tracking.
                </p>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="bg-green-50 border border-green-200 p-6 rounded-lg text-center"
            >
              <h3 className="font-space-grotesk text-lg font-semibold text-green-900 mb-2">
                Our Solution: Both, Separately
              </h3>
              <p className="font-inter text-base text-green-800 leading-relaxed">
                We strip metadata from the public-facing photo while generating a separate, cryptographic proof of authenticity that can be verified independently.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Component A: Metadata Stripper Section */}
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
              Component A: Metadata Stripper
            </h2>
            <p className="font-inter text-lg text-gray-600 mb-12 text-center leading-relaxed">
              Remove all EXIF, IPTC, and XMP data from the image before it leaves the device.
            </p>

            {/* What Gets Removed */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {[
                {
                  icon: <MapPin className="w-5 h-5" />,
                  title: "GPS Data",
                  items: ["Latitude/Longitude", "Altitude", "Location Name"]
                },
                {
                  icon: <Smartphone className="w-5 h-5" />,
                  title: "Device Info",
                  items: ["Camera Model", "Serial Number", "Software Version"]
                },
                {
                  icon: <FileCheck className="w-5 h-5" />,
                  title: "Timestamps",
                  items: ["Date Taken", "Date Modified", "Timezone"]
                }
              ].map((category, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="bg-gray-50 p-6 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-2 mb-3 text-red-600">
                    {category.icon}
                    <h3 className="font-space-grotesk text-base font-semibold">
                      {category.title}
                    </h3>
                  </div>
                  <ul className="space-y-1">
                    {category.items.map((item, i) => (
                      <li key={i} className="font-inter text-xs text-gray-600 flex items-center gap-2">
                        <span className="text-red-500">-</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>

            {/* Technical Implementation */}
            <div className="space-y-6 mb-12">
              <TechSpecCard
                title="Current Implementation"
                variant="current"
                specs={[
                  { label: "Library", value: "piexifjs (Lightweight, client-side)" },
                  { label: "Removes", value: "GPS, Device Model, Serial, Timezone" },
                  { label: "Format Support", value: "JPEG (HEIC converted first)" },
                  { label: "Processing", value: "Client-side only, never hits server" }
                ]}
              />

              {/* Code Example */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="font-space-grotesk text-base font-semibold text-gray-900 mb-3">
                  Workflow Example
                </h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs font-mono overflow-x-auto">
{`// 1. Load file ArrayBuffer
const arrayBuffer = await file.arrayBuffer();
const jpegData = new Uint8Array(arrayBuffer);

// 2. Strip EXIF using piexifjs
const cleanData = piexif.remove(jpegData);

// 3. Convert back to Blob
const cleanBlob = new Blob([cleanData], { type: 'image/jpeg' });

// 4. Encrypt and upload (metadata-free)
await encryptAndUpload(cleanBlob);`}
                </pre>
              </div>
            </div>

            {/* Before/After Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                <h3 className="font-space-grotesk text-base font-semibold text-red-900 mb-3">
                  Before Stripping
                </h3>
                <pre className="bg-white p-3 rounded text-xs font-mono text-gray-700 overflow-x-auto">
{`{
  "GPS": {
    "Latitude": "40.7128° N",
    "Longitude": "74.0060° W",
    "Altitude": "10m"
  },
  "Camera": {
    "Make": "Apple",
    "Model": "iPhone 14 Pro",
    "Serial": "FH8923KL"
  },
  "DateTime": "2026-01-15 14:23:07"
}`}
                </pre>
              </div>

              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <h3 className="font-space-grotesk text-base font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  After Stripping
                </h3>
                <pre className="bg-white p-3 rounded text-xs font-mono text-gray-700 overflow-x-auto">
{`{
  // All EXIF data removed
  // Image content preserved
  // File size reduced

  "Status": "Clean"
}`}
                </pre>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Component B: C2PA Authenticity Proof Section */}
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
              Component B: Proof of Authenticity
            </h2>
            <p className="font-inter text-lg text-gray-600 mb-12 text-center leading-relaxed">
              Create a standard Content Credential manifest that proves <strong>you</strong> took this photo at <strong>this</strong> time/place, without embedding it in the public image.
            </p>

            {/* C2PA Overview */}
            <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg mb-12">
              <h3 className="font-space-grotesk text-lg font-semibold text-blue-900 mb-3">
                What is C2PA?
              </h3>
              <p className="font-inter text-sm text-blue-800 leading-relaxed mb-4">
                The <strong>Coalition for Content Provenance and Authenticity</strong> is an industry standard backed by Adobe, Microsoft, Sony, and the BBC. It provides cryptographic proof that content is authentic.
              </p>
              <p className="font-inter text-xs text-blue-700">
                Learn more: <a href="https://c2pa.org" target="_blank" rel="noopener noreferrer" className="underline">c2pa.org</a>
              </p>
            </div>

            {/* Implementation Strategy */}
            <div className="space-y-6 mb-12">
              <h3 className="font-space-grotesk text-2xl font-semibold text-gray-900">
                How It Works
              </h3>

              {[
                {
                  step: "1. Capture",
                  description: "User takes a photo with the PhotoVault app."
                },
                {
                  step: "2. Sign (Private)",
                  description: "Use c2pa-js (WebAssembly) to create a Manifest with assertions: 'created by [user ID]' at [location]. Sign the manifest with the user's private key."
                },
                {
                  step: "3. Detach",
                  description: "Instead of embedding the manifest into the JPEG (which bloats it and risks leaks), we store the Manifest Store separately in the encrypted vault as a .c2pa file."
                },
                {
                  step: "4. Strip",
                  description: "The actual JPEG is stripped of traditional EXIF data using piexifjs."
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="bg-white p-5 rounded-lg border border-gray-200"
                >
                  <h4 className="font-space-grotesk text-base font-semibold text-gray-900 mb-2">
                    {item.step}
                  </h4>
                  <p className="font-inter text-sm text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Technical Specs */}
            <TechSpecCard
              title="Planned Implementation"
              variant="planned"
              specs={[
                { label: "Standard", value: "C2PA (Content Authenticity Initiative)" },
                { label: "Signature", value: "SHA-256 Hash + Original Metadata" },
                { label: "Library", value: "c2pa-js (WebAssembly)" },
                { label: "Verification", value: "Cryptographic proof via contentcredentials.org" }
              ]}
            />
          </motion.div>
        </div>
      </section>

      {/* Verification Flow Section */}
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
              Verification Flow
            </h2>
            <p className="font-inter text-lg text-gray-600 mb-12 text-center leading-relaxed">
              How editors and courts verify your photo's authenticity without exposing metadata.
            </p>

            <div className="space-y-6">
              {[
                {
                  step: "1. Journalist Sends Two Files",
                  details: ["photo.jpg (Stripped, public-facing)", "proof.c2pa (The manifest, private)"]
                },
                {
                  step: "2. Editor Opens Verification Tool",
                  details: ["Visit contentcredentials.org/verify", "Or use local C2PA verification tool"]
                },
                {
                  step: "3. Upload Both Files",
                  details: ["photo.jpg + proof.c2pa", "Tool matches cryptographic fingerprint"]
                },
                {
                  step: "4. Verification Result",
                  details: [
                    "This photo matches the cryptographic fingerprint",
                    "Signed by [Journalist ID] at [Location]",
                    "Captured on [Date] with [Device]",
                    "No evidence of manipulation"
                  ]
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="bg-gray-50 p-6 rounded-lg border border-gray-200"
                >
                  <h3 className="font-space-grotesk text-base font-semibold text-gray-900 mb-3">
                    {item.step}
                  </h3>
                  <ul className="space-y-1">
                    {item.details.map((detail, i) => (
                      <li key={i} className="font-inter text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
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
                  "Integrate piexifjs into src/lib/metadata.ts",
                  "Integrate c2pa-js (via WASM) for manifest creation",
                  "Create UI toggle: 'Generate Authenticity Proof?' in upload settings",
                  "Design .c2pa file storage system in encrypted vault",
                  "Build export feature for sharing photo + proof bundle",
                  "Test verification flow with contentcredentials.org",
                  "Security audit: ensure stripped files contain no hidden metadata"
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
              Should We Prioritize C2PA?
            </h3>
            <p className="font-inter text-base text-gray-600 mb-6 leading-relaxed">
              Is cryptographic proof of authenticity important for your work? Would you use this feature? Should we build this before other features?
            </p>
            <FeedbackButton
              featureName="Metadata Removal & C2PA"
              question="Should we prioritize C2PA?"
              className="text-sm px-6 py-3"
            />
          </motion.div>
        </div>
      </section>
    </FeaturePageLayout>
  );
}
