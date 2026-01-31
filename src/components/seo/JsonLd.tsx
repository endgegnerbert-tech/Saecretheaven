// JSON-LD Structured Data for SaecretHeaven
export function JsonLd() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "SaecretHeaven",
    "applicationCategory": "SecurityApplication",
    "operatingSystem": "Web, iOS, Android, macOS, Windows",
    "description": "Zero-knowledge encrypted photo vault with military-grade encryption. Store your photos securely with end-to-end encryption.",
    "url": "https://saecretheaven.com",
    "author": {
      "@type": "Person",
      "name": "Einar Jäger",
      "email": "einar@black-knight.dev"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "EUR",
      "availability": "https://schema.org/PreOrder"
    },
    "featureList": [
      "Zero-knowledge encryption",
      "End-to-end encrypted",
      "IPFS decentralized storage",
      "Multi-device sync",
      "Offline PWA support",
      "Military-grade XSalsa20-Poly1305 encryption"
    ],
    "screenshot": "https://saecretheaven.com/og-image.png"
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
