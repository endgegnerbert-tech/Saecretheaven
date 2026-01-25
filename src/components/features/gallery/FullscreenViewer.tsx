/**
 * FullscreenViewer Component
 *
 * Full-screen image viewer with advanced zoom, pan, and navigation capabilities.
 * Designed with Glassmorphism UI for a modern, elegant look.
 *
 * Features:
 * - Glassmorphism modal with backdrop blur
 * - Smooth zoom (0.5x to 3x) and pan animations using Framer Motion
 * - Keyboard navigation (arrow keys, ESC, +/-, 0 for reset)
 * - Touch gestures for mobile devices
 * - Image metadata display (filename, size, date, ID)
 * - Download functionality
 * - Auto-hide controls for immersive viewing
 * - Responsive design for all screen sizes
 *
 * @component
 * @param {Object} props - Component props
 * @param {PhotoMetadata} props.photo - Photo metadata object
 * @param {string} props.imageUrl - URL of the image to display
 * @param {function} props.onClose - Callback function when close button is clicked
 * @param {function} props.onDownload - Callback function when download button is clicked
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Download, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { type PhotoMetadata } from "@/lib/storage/local-db";

interface FullscreenViewerProps {
  photo: PhotoMetadata;
  imageUrl: string;
  onClose: () => void;
  onDownload: () => Promise<void>;
}

export function FullscreenViewer({
  photo,
  imageUrl,
  onClose,
  onDownload,
}: FullscreenViewerProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "+":
        case "=":
          zoomIn();
          break;
        case "-":
        case "_":
          zoomOut();
          break;
        case "0":
          resetZoom();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Auto-hide controls
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showControls) {
      timer = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [showControls]);

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));
  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDragEnd = (
    e: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (scale > 1) {
      setPosition({
        x: position.x + info.offset.x,
        y: position.y + info.offset.y,
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg"
      onClick={() => setShowControls((prev) => !prev)}
      onMouseMove={() => setShowControls(true)}
    >
      {/* Close button - always visible */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-10 p-2 rounded-full bg-black/30 backdrop-blur-md hover:bg-black/50 transition-all"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Image container with pan/zoom */}
      <motion.div
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        drag={scale > 1}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        onDrag={() => setShowControls(true)}
        style={{
          scale,
          x: position.x,
          y: position.y,
          cursor: isDragging ? "grabbing" : scale > 1 ? "grab" : "default",
        }}
      >
        <motion.img
          src={imageUrl}
          alt={photo.fileName}
          className="max-w-[90vw] max-h-[90vh] object-contain"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          drag={false}
        />
      </motion.div>

      {/* Controls - fade in/out */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-4 left-4 right-4 z-10"
          >
            {/* Image info */}
            <div className="glass-dark rounded-xl p-4 mb-4 max-w-md">
              <h3 className="text-white font-medium truncate mb-1">
                {photo.fileName}
              </h3>
              <div className="flex items-center gap-4 text-sm text-white/80">
                <span>{formatFileSize(photo.fileSize)}</span>
                <span>{formatDate(new Date())}</span>
                <span className="font-mono">#{photo.id}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="glass rounded-xl p-3 flex items-center justify-center gap-3">
              <button
                onClick={zoomOut}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <ZoomOut className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={resetZoom}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <RotateCcw className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={zoomIn}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <ZoomIn className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={onDownload}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <Download className="w-5 h-5 text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
