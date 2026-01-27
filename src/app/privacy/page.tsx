export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-black py-20 px-8 lg:px-20 max-w-4xl mx-auto">
      <h1 className="font-syne text-4xl mb-6">Privacy Policy</h1>
      <p className="font-inter text-gray-600 mb-4">
        Last updated: {new Date().toLocaleDateString()}
      </p>
      <div className="prose prose-gray">
        <p>At SaecretHeaven, your privacy is our core mission. We operate on a Zero-Knowledge architecture.</p>
        <h3>1. Data Collection</h3>
        <p>We collect minimal metadata solely for synchronization purposes. We cannot access your encrypted content.</p>
        <h3>2. Encryption</h3>
        <p>All photos are encrypted on your device before upload. You hold the keys.</p>
        <h3>3. Analytics</h3>
        <p>We use Vercel Analytics to understand website traffic and improve user experience. This service collects anonymous data about visitor interactions. No personally identifiable information (PII) is collected or stored.</p>
      </div>
    </div>
  );
}
