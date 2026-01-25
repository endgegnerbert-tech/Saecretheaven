/**
 * PhotoCard - Single Photo Item with Glassmorphism and Animations
 *
 * Features:
 * - Glassmorphism card design with backdrop blur
 * - Smooth fade-in animation on image load
 * - Hover effects with scale and shadow
 * - Loading and error states with animations
 * - Delete button with smooth transitions
 */

"use client";

import { useState, useEffect } from "react";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { type PhotoMetadata } from "@/lib/storage/local-db";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface PhotoCardProps {
  photo: PhotoMetadata;
  decryptPhoto: (photo: PhotoMetadata) => Promise<string | null>;
  onDelete?: (id: number) => void;
}

export function PhotoCard({ photo, decryptPhoto, onDelete }: PhotoCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const decrypt = async () => {
      try {
        const url = await decryptPhoto(photo);
        if (mounted) {
          setImageUrl(url);
          setIsLoading(false);
        }
      } catch {
        if (mounted) {
          setError(true);
          setIsLoading(false);
        }
      }
    };

    decrypt();

    return () => {
      mounted = false;
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [photo, decryptPhoto]);

  return (
    <motion.div
      className={cn(
        "group relative aspect-square rounded-xl overflow-hidden",
        "bg-white/5 backdrop-blur-sm",
        "border border-white/10 hover:border-primary/30",
        "transition-all duration-300 ease-in-out",
        "shadow-sm hover:shadow-lg",
        "transform hover:scale-[1.02]",
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                repeat: Infinity,
                duration: 1.5,
                ease: "linear",
              }}
            >
              <Loader2 className="w-6 h-6 text-primary" />
            </motion.div>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          >
            <AlertTriangle className="w-8 h-8 text-destructive mb-2" />
            <p className="text-sm text-white font-medium">Decryption failed</p>
            <p className="text-xs text-white/80 mt-1">
              This photo cannot be displayed
            </p>
          </motion.div>
        )}

        {imageUrl && (
          <>
            <motion.img
              src={imageUrl}
              alt={photo.fileName}
              className="w-full h-full object-cover"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              onLoad={() => setIsLoading(false)}
            />

            {onDelete && (
              <motion.button
                onClick={() => photo.id && onDelete(photo.id)}
                className={cn(
                  "absolute top-2 right-2 p-2 rounded-lg",
                  "bg-black/50 backdrop-blur-sm",
                  "border border-white/10",
                  "opacity-0 group-hover:opacity-100",
                  "transition-all duration-300",
                  "hover:bg-destructive/20 hover:border-destructive/50 hover:scale-110",
                )}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Trash2 className="w-4 h-4 text-white" />
              </motion.button>
            )}
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
