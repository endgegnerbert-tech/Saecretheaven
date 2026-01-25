/**
 * UploadProgress Component
 *
 * Displays upload progress for individual photos with animated progress bar.
 * Supports multiple states: uploading, encrypting, success, and error.
 *
 * Features:
 * - Glassmorphism design with backdrop blur
 * - Animated progress bar using Framer Motion
 * - File name and size display with automatic formatting
 * - Success/error states with appropriate icons and colors
 * - Smooth transitions for appearance and disappearance
 * - Auto-hide after successful completion
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} props.fileName - Name of the file being uploaded
 * @param {number} props.fileSize - Size of the file in bytes
 * @param {number} props.progress - Upload progress percentage (0-100)
 * @param {'uploading' | 'encrypting' | 'success' | 'error'} [props.status='uploading'] - Current upload status
 * @param {function} [props.onCancel] - Callback function when cancel button is clicked
 */

"use client";

import { useState, useEffect } from "react";
import { Check, X, Loader2, CloudUpload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UploadProgressProps {
  fileName: string;
  fileSize: number;
  progress: number; // 0-100
  status?: "uploading" | "encrypting" | "success" | "error";
  onCancel?: () => void;
}

export function UploadProgress({
  fileName,
  fileSize,
  progress,
  status = "uploading",
  onCancel,
}: UploadProgressProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-hide after success
  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (!isVisible) return null;

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusIcon = () => {
    switch (status) {
      case "success":
        return <Check className="w-5 h-5 text-success" />;
      case "error":
        return <X className="w-5 h-5 text-destructive" />;
      case "encrypting":
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      default:
        return <CloudUpload className="w-5 h-5 text-primary" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "success":
        return "Upload complete";
      case "error":
        return "Upload failed";
      case "encrypting":
        return "Encrypting...";
      default:
        return "Uploading...";
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="glass rounded-lg p-3 mb-2 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">{getStatusIcon()}</div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate max-w-[180px] sm:max-w-[250px]">
                {fileName}
              </span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatFileSize(fileSize)}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {getStatusText()}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {progress}%
              </span>
            </div>

            <div className="w-full h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  status === "success"
                    ? "bg-success"
                    : status === "error"
                      ? "bg-destructive"
                      : "bg-primary"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
          </div>

          {onCancel && status !== "success" && (
            <button
              onClick={onCancel}
              className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
