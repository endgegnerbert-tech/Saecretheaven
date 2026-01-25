/**
 * HEIC Converter - Non-blocking HEIC to JPEG conversion
 * Uses Web Worker for iPad/iPhone performance optimization
 *
 * Phase 2: Performance Optimization
 */

interface ConversionResult {
    file: File;
    converted: boolean;
    originalSize?: number;
    convertedSize?: number;
}

// Singleton worker instance
let worker: Worker | null = null;
let messageId = 0;
const pendingConversions = new Map<number, {
    resolve: (result: ConversionResult) => void;
    reject: (error: Error) => void;
}>();

/**
 * Initialize the HEIC worker (lazy initialization)
 */
function getWorker(): Worker | null {
    if (typeof window === 'undefined') return null;

    if (!worker) {
        try {
            worker = new Worker('/workers/heic-worker.js');
            worker.onmessage = handleWorkerMessage;
            worker.onerror = handleWorkerError;
            console.log('[HEIC] Worker initialized');
        } catch (error) {
            console.warn('[HEIC] Worker creation failed, will use main thread:', error);
            return null;
        }
    }

    return worker;
}

/**
 * Handle messages from the worker
 */
function handleWorkerMessage(e: MessageEvent) {
    const { id, success, file, blob, fileName, mimeType, converted, error, originalSize, convertedSize } = e.data;

    const pending = pendingConversions.get(id);
    if (!pending) return;

    pendingConversions.delete(id);

    if (!success) {
        pending.reject(new Error(error || 'Conversion failed'));
        return;
    }

    // If we got a blob back, create a File from it
    if (blob && converted) {
        const convertedFile = new File([blob], fileName, {
            type: mimeType,
            lastModified: Date.now()
        });
        pending.resolve({
            file: convertedFile,
            converted: true,
            originalSize,
            convertedSize
        });
    } else {
        // Original file returned (not HEIC or conversion skipped)
        pending.resolve({
            file: file,
            converted: false
        });
    }
}

/**
 * Handle worker errors
 */
function handleWorkerError(error: ErrorEvent) {
    console.error('[HEIC] Worker error:', error);
    // Reject all pending conversions
    pendingConversions.forEach(({ reject }) => {
        reject(new Error('Worker error: ' + error.message));
    });
    pendingConversions.clear();

    // Reset worker for retry
    worker = null;
}

/**
 * Convert HEIC/HEIF to JPEG using Web Worker (non-blocking)
 * Falls back to main thread if worker is unavailable
 */
export async function convertHeicToJpeg(file: File, quality: number = 0.92): Promise<ConversionResult> {
    // Check if conversion is needed first
    const heicTypes = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];
    const isHeic = heicTypes.includes(file.type?.toLowerCase()) ||
                   file.name?.toLowerCase().endsWith('.heic') ||
                   file.name?.toLowerCase().endsWith('.heif');

    if (!isHeic) {
        return { file, converted: false };
    }

    // Try to use Web Worker for non-blocking conversion
    const workerInstance = getWorker();

    if (workerInstance) {
        return new Promise((resolve, reject) => {
            const id = ++messageId;
            pendingConversions.set(id, { resolve, reject });

            // Set timeout for conversion (2 minutes max)
            setTimeout(() => {
                if (pendingConversions.has(id)) {
                    pendingConversions.delete(id);
                    console.warn('[HEIC] Worker timeout, falling back to main thread');
                    convertOnMainThread(file, quality).then(resolve).catch(reject);
                }
            }, 120000);

            workerInstance.postMessage({ id, file, quality });
        });
    }

    // Fallback to main thread
    console.log('[HEIC] Using main thread conversion');
    return convertOnMainThread(file, quality);
}

/**
 * Fallback: Convert on main thread (blocks UI but works everywhere)
 */
async function convertOnMainThread(file: File, quality: number): Promise<ConversionResult> {
    try {
        // Dynamic import heic2any
        const heic2any = (await import('heic2any')).default;

        const convertedBlob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality
        });

        const resultBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');

        const convertedFile = new File([resultBlob], newFileName, {
            type: 'image/jpeg',
            lastModified: file.lastModified
        });

        return {
            file: convertedFile,
            converted: true,
            originalSize: file.size,
            convertedSize: convertedFile.size
        };
    } catch (error) {
        console.error('[HEIC] Main thread conversion failed:', error);
        // Return original on error
        return { file, converted: false };
    }
}

/**
 * Check if the file is a HEIC/HEIF image
 */
export function isHeicFile(file: File): boolean {
    const heicTypes = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];
    return heicTypes.includes(file.type?.toLowerCase()) ||
           file.name?.toLowerCase().endsWith('.heic') ||
           file.name?.toLowerCase().endsWith('.heif');
}

/**
 * Terminate the worker (call on app cleanup)
 */
export function terminateHeicWorker(): void {
    if (worker) {
        worker.terminate();
        worker = null;
        pendingConversions.clear();
        console.log('[HEIC] Worker terminated');
    }
}
