'use client';

/**
 * DirectCameraTheme - No Disguise, Direct Camera
 *
 * Opens the camera immediately without any disguise.
 * Simple and fast for trusted contacts.
 *
 * TRIGGER: Automatic on page load (no unlock needed)
 */

import { useState, useEffect } from 'react';
import { Shield, X } from 'lucide-react';
import { StealthCamera } from '../StealthCamera';

interface DirectCameraThemeProps {
  /** Content slug from URL */
  contentSlug: string;
  /** Public key for encryption */
  publicKey: string | null;
  /** Burner link slug */
  burnerSlug: string;
}

export function DirectCameraTheme({ contentSlug, publicKey, burnerSlug }: DirectCameraThemeProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [hasUploaded, setHasUploaded] = useState(false);

  // Auto-open camera after brief delay
  useEffect(() => {
    if (publicKey && !hasUploaded) {
      const timer = setTimeout(() => {
        setShowCamera(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [publicKey, hasUploaded]);

  // Handle upload complete
  const handleComplete = () => {
    setShowCamera(false);
    setHasUploaded(true);
  };

  // Handle camera close
  const handleClose = () => {
    setShowCamera(false);
  };

  // Camera overlay
  if (showCamera && publicKey) {
    return (
      <StealthCamera
        publicKey={publicKey}
        slug={burnerSlug}
        onComplete={handleComplete}
        onClose={handleClose}
        successMessage="Sicher übertragen!"
      />
    );
  }

  // Success state after upload
  if (hasUploaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/20 flex items-center justify-center">
            <Shield className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Erfolgreich gesendet</h1>
          <p className="text-green-100 max-w-xs mx-auto">
            Dein Foto wurde sicher verschlüsselt und übertragen.
          </p>
          <button
            onClick={() => {
              setHasUploaded(false);
              setShowCamera(true);
            }}
            className="mt-8 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
          >
            Weiteres Foto senden
          </button>
        </div>
      </div>
    );
  }

  // Loading / Waiting state
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
      <div className="text-center text-white">
        {publicKey ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-blue-100">Kamera wird gestartet...</p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/20 flex items-center justify-center">
              <X className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Link ungültig</h1>
            <p className="text-blue-100 max-w-xs mx-auto">
              Dieser Link ist abgelaufen oder wurde bereits verwendet.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default DirectCameraTheme;
