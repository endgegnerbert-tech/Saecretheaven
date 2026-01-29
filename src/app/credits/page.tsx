import Navigation from "@/components/landing/landing/Navigation";

export default function CreditsPage() {
  const musicCredits = [
    {
      title: "Shimmer",
      artist: "Ambyion, Abandoned & GalaxyTones",
      url: "https://www.audiolibrary.com.co/ambyion-abandoned-and-galaxytones/shimmer",
      license: "CC BY 3.0",
      channel: "https://soundcloud.com/galaxytones"
    }
  ];

  return (
    <div className="min-h-screen bg-white text-black">
      <Navigation />
      
      <main className="pt-32 pb-20 px-6 lg:px-8 max-w-3xl mx-auto">
        <h1 className="text-4xl lg:text-5xl font-bold font-syne mb-8">Credits & Attributions</h1>
        
        <p className="text-lg text-gray-600 mb-12 leading-relaxed">
          SaecretHeaven is built with respect for creators. We use high-quality music and imagery under Creative Commons and Open Source licenses.
        </p>

        <section className="mb-16">
          <h2 className="text-2xl font-bold font-syne mb-6 border-b border-gray-100 pb-2">Music</h2>
          <div className="space-y-8">
            {musicCredits.map((m, idx) => (
              <div key={idx} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 transition-hover hover:border-blue-200">
                <h3 className="text-xl font-bold text-gray-900 mb-1">{m.title}</h3>
                <p className="text-blue-600 font-medium mb-3">by {m.artist}</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-black underline">Stream / Download</a>
                  <a href={m.channel} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-black underline">Artist Page</a>
                  <span className="text-gray-400 bg-gray-200/50 px-2 py-0.5 rounded text-[10px] uppercase font-bold self-center">License: {m.license}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-bold font-syne mb-6 border-b border-gray-100 pb-2">Imagery</h2>
          <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Unsplash</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              Visuals across the landing page and demo mockups are provided by the amazing community of photographers at Unsplash. 
            </p>
            <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm font-semibold hover:underline">Explore Unsplash →</a>
          </div>
        </section>

        <div className="mt-20 pt-8 border-t border-gray-100 text-center">
          <a href="/" className="text-sm font-bold text-black hover:text-blue-600 transition-colors">← Back to Home</a>
        </div>
      </main>

      <footer className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-400 text-xs">
          © 2026 SaecretHeaven. Audio promoted by Audio Library.
        </div>
      </footer>
    </div>
  );
}
