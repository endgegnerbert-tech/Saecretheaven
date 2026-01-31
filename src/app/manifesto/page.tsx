import Navigation from "@/components/landing/landing/Navigation";

export default function ManifestoPage() {
  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-blue-100">
      <Navigation />
      
      <main className="max-w-3xl mx-auto px-6 py-32 lg:py-40">
        <header className="mb-16">
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter mb-8 leading-[0.9]">
            Why We Are <br/>
            <span className="text-blue-700">Building This.</span>
          </h1>
          <div className="h-1 w-20 bg-black"></div>
        </header>

        <article className="prose prose-lg prose-gray max-w-none">
          <p className="lead text-2xl font-medium text-gray-900 mb-8">
            Privacy tools used to be about avoiding targeted ads. Now, they are about survival.
          </p>

          <p>
            In an era of digital authoritarianism, rising censorship, and invasive surveillance, the smartphone has become a double-edged sword. It is our most powerful tool for documenting truth, but also the greatest liability to our safety.
          </p>

          <h3>The Problem</h3>
          <p>
            Standard "secure" galleries operate on a flaw: they rely on the operating system's trust. When you take a photo, it touches the disk. When you delete it, the flash storage remembers. If your device is seized at a border crossing or a protest, biometric unlocks can be compelled, and forensic tools can recover "deleted" evidence in minutes.
          </p>

          <h3>Our Mission</h3>
          <p>
            <strong>SaecretHeaven</strong> was born from a realization: we need a tool that assumes the device <em>will</em> be compromised. 
          </p>
          <p>
            We are building a "Zero-Trace" architecture. By capturing media directly into volatile memory (RAM) and encrypting it immediately before it ever touches the file system, we aim to eliminate the forensic footprint entirely.
          </p>

          <blockquote>
            "If it's not open source, it's not secure. Trust brings vulnerability. Verification brings strength."
          </blockquote>

          <h3>The Pledge</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Open Source Forever:</strong> The code will always be audible. No backdoors.</li>
            <li><strong>Local First:</strong> Your keys never leave your device. We cannot see your data even if we wanted to.</li>
            <li><strong>Community Driven:</strong> We build what the frontlines need, not what VCs want.</li>
          </ul>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="italic text-gray-500">
              — Blackknight
            </p>
          </div>
        </article>
      </main>
    </div>
  );
}
