'use client';

/**
 * StealthCamera Component
 *
 * RAM-Only camera capture for stealth uploads.
 * Captures photos without ever touching the disk.
 *
 * SECURITY GUARANTEES:
 * - NO file picker (avoids iOS thumbnail caching)
 * - NO IndexedDB storage during capture
 * - NO localStorage during capture
 * - Canvas cleared immediately after capture
 * - Video stream stopped immediately after capture
 * - Blob goes directly to encryption
 *
 * FLOW:
 * 1. Request camera with getUserMedia
 * 2. Display live preview in video element
 * 3. Capture to canvas (RAM only)
 * 4. Convert to blob
 * 5. Encrypt immediately with public key
 * 6. Clear canvas, stop stream
 * 7. Upload encrypted blob
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { encryptFileForBurner } from '@/lib/crypto-asymmetric';
import { Camera, X, RefreshCw, Send, CheckCircle, AlertCircle } from 'lucide-react';

interface StealthCameraProps {
  /** Base64URL-encoded P-256 public key for encryption */
  publicKey: string;
  /** Burner link slug for upload */
  slug: string;
  /** Called when capture and upload is complete */
  onComplete: () => void;
  /** Called when user cancels */
  onClose: () => void;
  /** Optional: Innocent message to show after upload */
  successMessage?: string;
}

type CameraState = 'initializing' | 'ready' | 'captured' | 'uploading' | 'success' | 'error';

export function StealthCamera({
  publicKey,
  slug,
  onComplete,
  onClose,
  successMessage = 'Recipe saved to favorites!',
}: StealthCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<CameraState>('initializing');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  /**
   * Initialize camera stream
   */
  const initializeCamera = useCallback(async () => {
    setState('initializing');
    setError(null);

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState('ready');
    } catch (err) {
      console.error('[StealthCamera] Failed to initialize:', err);
      setError('Camera access denied. Please allow camera access and try again.');
      setState('error');
    }
  }, [facingMode]);

  /**
   * Capture photo to canvas (RAM only)
   */
  const capturePhoto = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      setError('Camera not ready');
      return;
    }

    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setError('Failed to create canvas context');
        return;
      }

      ctx.drawImage(video, 0, 0);

      // Convert to blob (still in RAM)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to create blob'));
          },
          'image/jpeg',
          0.9
        );
      });

      // Create preview URL (temporary, in memory)
      const previewUrl = URL.createObjectURL(blob);

      setCapturedBlob(blob);
      setCapturedImage(previewUrl);
      setState('captured');

      // Stop video stream (camera off)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    } catch (err) {
      console.error('[StealthCamera] Capture failed:', err);
      setError('Failed to capture photo');
      setState('error');
    }
  }, []);

  /**
   * Encrypt and upload the captured photo
   */
  const uploadPhoto = useCallback(async () => {
    if (!capturedBlob) {
      setError('No photo to upload');
      return;
    }

    if (!publicKey) {
      setError('Missing encryption key. Please use the complete link.');
      setState('error');
      return;
    }

    setState('uploading');

    try {
      // Encrypt the photo with the public key
      let encrypted;
      try {
        encrypted = await encryptFileForBurner(capturedBlob, publicKey);
      } catch (encryptError) {
        console.error('[StealthCamera] Encryption failed:', encryptError);
        throw new Error('Encryption failed. Invalid link.');
      }

      // Prepare form data for upload
      const formData = new FormData();
      formData.append('file', encrypted.encryptedBlob, 'capture.bin');
      formData.append('slug', slug);
      formData.append('ephemeralPublicKey', encrypted.ephemeralPublicKey);
      formData.append('iv', encrypted.iv);
      formData.append('salt', encrypted.salt);

      // Upload to burner endpoint with retry
      let response;
      let retries = 2;

      while (retries >= 0) {
        try {
          response = await fetch('/api/burner/upload', {
            method: 'POST',
            body: formData,
          });
          break; // Success, exit retry loop
        } catch (fetchError) {
          if (retries === 0) throw fetchError;
          retries--;
          // Wait 1 second before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!response || !response.ok) {
        const result = response ? await response.json().catch(() => ({})) : {};
        const errorCode = result.code || 'UNKNOWN';

        // User-friendly error messages based on error code
        let userMessage = 'Upload failed. Please try again.';
        if (errorCode === 'RATE_LIMIT_EXCEEDED') {
          userMessage = 'Too many uploads. Please wait and try again.';
        } else if (errorCode === 'PINATA_ERROR' || errorCode === 'IPFS_ERROR') {
          userMessage = 'Upload service temporarily unavailable.';
        } else if (errorCode === 'LINK_EXPIRED') {
          userMessage = 'This link has expired.';
        } else if (errorCode === 'UPLOAD_LIMIT_REACHED') {
          userMessage = 'Upload limit reached for this link.';
        }

        throw new Error(userMessage);
      }

      // SECURITY: Clear all captured data
      clearCapturedData();

      setState('success');

      // Close after showing success message
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      console.error('[StealthCamera] Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setState('error');
    }
  }, [capturedBlob, onComplete, publicKey, slug]);

  /**
   * Clear all captured data from memory
   */
  const clearCapturedData = useCallback(() => {
    // Revoke preview URL
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }

    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      canvas.width = 0;
      canvas.height = 0;
    }

    // Clear state
    setCapturedBlob(null);
    setCapturedImage(null);
  }, [capturedImage]);

  /**
   * Retake photo
   */
  const retakePhoto = useCallback(() => {
    clearCapturedData();
    initializeCamera();
  }, [clearCapturedData, initializeCamera]);

  /**
   * Switch camera
   */
  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, []);

  /**
   * Close and cleanup
   */
  const handleClose = useCallback(() => {
    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear captured data
    clearCapturedData();

    onClose();
  }, [clearCapturedData, onClose]);

  /**
   * Initialize camera on mount
   */
  useEffect(() => {
    initializeCamera();

    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Re-initialize when facing mode changes
   */
  useEffect(() => {
    if (state === 'ready' || state === 'initializing') {
      initializeCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
        <button
          onClick={handleClose}
          className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {state === 'ready' && (
          <button
            onClick={switchCamera}
            className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
            aria-label="Switch camera"
          >
            <RefreshCw className="w-6 h-6 text-white" />
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center">
        {/* Initializing state */}
        {state === 'initializing' && (
          <div className="text-center text-white">
            <Camera className="w-16 h-16 mx-auto mb-4 animate-pulse" />
            <p>Initializing camera...</p>
          </div>
        )}

        {/* Camera preview */}
        {(state === 'ready' || state === 'initializing') && (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
        )}

        {/* Captured image preview */}
        {capturedImage && (state === 'captured' || state === 'uploading') && (
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full h-full object-cover"
          />
        )}

        {/* Success state */}
        {state === 'success' && (
          <div className="text-center text-white p-8">
            <CheckCircle className="w-20 h-20 mx-auto mb-4 text-green-500" />
            <p className="text-xl font-medium">{successMessage}</p>
          </div>
        )}

        {/* Error state */}
        {state === 'error' && (
          <div className="text-center text-white p-8">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <p className="text-lg mb-4">{error}</p>
            <button
              onClick={initializeCamera}
              className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center items-center bg-gradient-to-t from-black/50 to-transparent">
        {/* Capture button */}
        {state === 'ready' && (
          <button
            onClick={capturePhoto}
            className="w-20 h-20 rounded-full bg-white border-4 border-white/50 hover:scale-105 active:scale-95 transition-transform"
            aria-label="Capture photo"
          >
            <span className="sr-only">Capture</span>
          </button>
        )}

        {/* Captured state controls */}
        {state === 'captured' && (
          <div className="flex gap-8">
            <button
              onClick={retakePhoto}
              className="flex flex-col items-center text-white"
            >
              <div className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                <RefreshCw className="w-6 h-6" />
              </div>
              <span className="text-sm mt-2">Retake</span>
            </button>

            <button
              onClick={uploadPhoto}
              className="flex flex-col items-center text-white"
            >
              <div className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors">
                <Send className="w-6 h-6" />
              </div>
              <span className="text-sm mt-2">Send</span>
            </button>
          </div>
        )}

        {/* Uploading state */}
        {state === 'uploading' && (
          <div className="text-center text-white">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
              <Send className="w-6 h-6" />
            </div>
            <p className="text-sm mt-2">Uploading...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default StealthCamera;
