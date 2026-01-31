"use client";

import { EyeOff, Camera, Cpu, Upload, Shield } from "lucide-react";
import FeaturePageLayout from "@/components/features/FeaturePageLayout";
import FeatureHero from "@/components/features/FeatureHero";
import TechSpecCard from "@/components/features/TechSpecCard";
import FeedbackButton from "@/components/features/FeedbackButton";
import { motion } from "framer-motion";

export default function SecureDropPage() {
  return (
    <FeaturePageLayout>
      <FeatureHero
        title="Zero-Trace Capture"
        subtitle="Secure Drop for Anonymous Sources"
        description="Allows whistleblowers to capture and upload sensitive evidence without leaving any forensic trace on their own device. Photos never touch the disk—only volatile RAM."
        status="In Development"
        icon={<EyeOff className="w-8 h-8" />}
      />

      {/* The Forensic Problem Section */}
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
              The Forensic Problem
            </h2>
            <p className="font-inter text-lg text-gray-600 mb-12 text-center leading-relaxed">
              Standard mobile workflows are fatal for whistleblowers because every photo leaves a permanent trace.
            </p>

            {/* Standard Workflow Risks */}
            <div className="space-y-4 mb-12">
              {[
                {
                  step: "1. Camera App Saves to SSD",
                  description: "The Camera app writes a JPEG file directly to the device's solid-state drive.",
                  risk: "File remains in unallocated blocks even after 'deletion'"
                },
                {
                  step: "2. Recoverable by Forensic Tools",
                  description: "Tools like Cellebrite and Magnet AXIOM can recover deleted files from unallocated storage.",
                  risk: "Evidence persists for months or years"
                },
                {
                  step: "3. Thumbnails and Cache Files",
                  description: "System folders store thumbnails, previews, and metadata caches automatically.",
                  risk: "Multiple copies scattered across the filesystem"
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="bg-white p-6 rounded-lg border border-red-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-space-grotesk text-base font-semibold text-gray-900 mb-2">
                        {item.step}
                      </h3>
                      <p className="font-inter text-sm text-gray-600 mb-2 leading-relaxed">
                        {item.description}
                      </p>
                      <p className="font-inter text-xs text-red-600 font-semibold">
                        Risk: {item.risk}
                      </p>
                    </div>
                  </div>
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
                "Deleted files are never truly deleted. They're just marked as 'available to overwrite.'"
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Zero-Trace Architecture Section */}
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
              Zero-Trace Architecture
            </h2>
            <p className="font-inter text-lg text-gray-600 mb-12 text-center leading-relaxed">
              We utilize the browser's ability to handle media streams entirely in <strong>Volatile Memory (RAM)</strong>.
            </p>

            {/* Capture Flow */}
            <div className="space-y-6 mb-12">
              {[
                {
                  icon: <Camera className="w-6 h-6" />,
                  title: "1. Stream from Camera",
                  api: "navigator.mediaDevices.getUserMedia()",
                  description: "Request camera access with environment-facing mode (rear camera).",
                  code: `navigator.mediaDevices.getUserMedia({
  video: { facingMode: 'environment' }
})`
                },
                {
                  icon: <Cpu className="w-6 h-6" />,
                  title: "2. Render in RAM",
                  api: "<video> element + <canvas>",
                  description: "Stream is piped to a <video> element (viewfinder). On button press, draw the current video frame to an off-screen <canvas>.",
                  code: `const canvas = document.createElement('canvas');
canvas.width = video.videoWidth;
canvas.height = video.videoHeight;
ctx.drawImage(video, 0, 0);`
                },
                {
                  icon: <Shield className="w-6 h-6" />,
                  title: "3. In-Memory Encryption",
                  api: "TweetNaCl.box (ephemeral key)",
                  description: "Convert canvas to Blob using canvas.toBlob(). Encrypt the ArrayBuffer immediately using the journalist's public key. CRITICAL: Never permit the browser to trigger a 'Download'.",
                  code: `canvas.toBlob(async (blob) => {
  const encrypted = await encrypt(blob, journalistPublicKey);
  await uploadToIPFS(encrypted);
  blob = null; // Destroy original
});`
                },
                {
                  icon: <Upload className="w-6 h-6" />,
                  title: "4. Upload & Wipe",
                  api: "POST to IPFS + Page Reload",
                  description: "The encrypted blob is POSTed to the server. On success, reload the page to flush DOM and JS heap from memory.",
                  code: `await fetch('/api/ipfs/upload', {
  method: 'POST',
  body: encrypted
});
window.location.reload(); // Flush RAM`
                }
              ].map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="bg-gray-50 p-6 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-space-grotesk text-lg font-semibold text-gray-900 mb-1">
                        {step.title}
                      </h3>
                      <p className="font-mono text-xs text-blue-600 mb-3">
                        {step.api}
                      </p>
                    </div>
                  </div>
                  <p className="font-inter text-sm text-gray-600 mb-3 leading-relaxed">
                    {step.description}
                  </p>
                  <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono overflow-x-auto">
                    {step.code}
                  </pre>
                </motion.div>
              ))}
            </div>

            {/* Key Principle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="bg-green-50 border border-green-200 p-6 rounded-lg text-center"
            >
              <p className="font-inter text-base text-green-900 font-semibold">
                The photo never touches the disk. Only RAM. No forensic recovery possible.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* User Experience Section */}
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
              User Experience
            </h2>
            <p className="font-inter text-lg text-gray-600 mb-12 text-center leading-relaxed">
              Simple, anonymous, and secure by design.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="bg-white p-6 rounded-lg border border-gray-200"
              >
                <h3 className="font-space-grotesk text-lg font-semibold text-gray-900 mb-2">
                  URL Structure
                </h3>
                <p className="font-mono text-sm text-blue-600 mb-2">
                  saecretheaven.com/drop/&lt;random-token&gt;
                </p>
                <p className="font-inter text-sm text-gray-600 leading-relaxed">
                  Each journalist generates a unique drop URL. Sources use this URL to submit evidence anonymously.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="bg-white p-6 rounded-lg border border-gray-200"
              >
                <h3 className="font-space-grotesk text-lg font-semibold text-gray-900 mb-2">
                  Camera-Like Interface
                </h3>
                <p className="font-inter text-sm text-gray-600 leading-relaxed">
                  Looks like a standard camera app, but runs entirely in the browser. No app download required.
                </p>
              </motion.div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg mb-8">
              <h3 className="font-space-grotesk text-base font-semibold text-amber-900 mb-2">
                Privacy Warning (Mandatory)
              </h3>
              <p className="font-inter text-sm text-amber-800 leading-relaxed">
                "Photos taken here are never saved to your phone. If you close this tab before uploading, they are gone forever."
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="font-space-grotesk text-base font-semibold text-gray-900 mb-3">
                Success Feedback
              </h3>
              <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono overflow-x-auto">
{`// On successful upload:
navigator.vibrate([200]); // Haptic confirmation
window.location.reload(); // Flush memory`}
              </pre>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Technical Requirements Section */}
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
              Technical Requirements
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <TechSpecCard
                title="Browser APIs"
                variant="current"
                specs={[
                  { label: "WebRTC", value: "getUserMedia for camera access" },
                  { label: "Canvas API", value: "toBlob() for frame capture" },
                  { label: "Encryption", value: "TweetNaCl.box (ephemeral key)" },
                  { label: "HTTPS", value: "Required for iOS Safari camera access" }
                ]}
              />
              <TechSpecCard
                title="Security Constraints"
                variant="current"
                specs={[
                  { label: "Permissions", value: "Camera permission requested contextually" },
                  { label: "CORS", value: "IPFS upload via server proxy" },
                  { label: "Memory", value: "Page reload to flush JS heap" },
                  { label: "Forensics", value: "No disk writes at any stage" }
                ]}
              />
            </div>

            {/* Security Analysis */}
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="font-space-grotesk text-lg font-semibold text-gray-900 mb-4">
                  Security Analysis
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 mb-1">
                      What if the tab crashes before upload?
                    </h4>
                    <p className="font-inter text-sm text-gray-600 leading-relaxed">
                      The photo is lost, but that's the design. No trace remains on the device. Source must retake the photo.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 mb-1">
                      What if the phone is seized mid-upload?
                    </h4>
                    <p className="font-inter text-sm text-gray-600 leading-relaxed">
                      The encrypted blob may be in transit, but it's useless without the journalist's private key. The original photo is already destroyed.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 mb-1">
                      Can browser history reveal the drop URL?
                    </h4>
                    <p className="font-inter text-sm text-gray-600 leading-relaxed">
                      Yes. Sources should use private/incognito mode or clear history immediately after. Future enhancement: noHistory flag.
                    </p>
                  </div>
                </div>
              </div>
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
              Feedback on Zero-Trace Workflow
            </h3>
            <p className="font-inter text-base text-gray-600 mb-6 leading-relaxed">
              Does this workflow meet your threat model? Should we add video support? What about multi-photo batches?
            </p>
            <FeedbackButton
              featureName="Secure Drop (Zero-Trace)"
              question="Feedback on the workflow"
              className="text-sm px-6 py-3"
            />
          </motion.div>
        </div>
      </section>
    </FeaturePageLayout>
  );
}
