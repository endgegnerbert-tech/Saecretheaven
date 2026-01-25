/**
 * HEIC Conversion Web Worker
 * Converts HEIC/HEIF images to JPEG in a background thread
 * This prevents UI blocking on iPad/iPhone during photo upload
 *
 * Phase 2: Performance Optimization
 */

// Import heic2any via importScripts (workers can't use ES modules directly)
// The library will be loaded from a CDN for simplicity
let heic2any = null;

self.onmessage = async function(e) {
    const { id, file, quality = 0.92 } = e.data;

    try {
        // Check if conversion is needed
        const heicTypes = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];
        const isHeic = heicTypes.includes(file.type?.toLowerCase()) ||
                       file.name?.toLowerCase().endsWith('.heic') ||
                       file.name?.toLowerCase().endsWith('.heif');

        if (!isHeic) {
            // Not HEIC, return the original file
            self.postMessage({
                id,
                success: true,
                file: file,
                converted: false
            });
            return;
        }

        // Lazy load heic2any
        if (!heic2any) {
            try {
                // Import heic2any dynamically
                importScripts('https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js');
                // heic2any is now available as a global
            } catch (importError) {
                console.warn('[HEIC Worker] Failed to load heic2any, returning original:', importError);
                self.postMessage({
                    id,
                    success: true,
                    file: file,
                    converted: false,
                    warning: 'heic2any not available'
                });
                return;
            }
        }

        console.log('[HEIC Worker] Converting:', file.name);

        // Convert HEIC to JPEG
        const convertedBlob = await self.heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: quality
        });

        // heic2any can return array for multi-frame HEIC
        const resultBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

        // Create new filename with .jpg extension
        const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');

        console.log('[HEIC Worker] Conversion complete:', {
            original: { name: file.name, size: file.size },
            converted: { name: newFileName, size: resultBlob.size }
        });

        self.postMessage({
            id,
            success: true,
            blob: resultBlob,
            fileName: newFileName,
            mimeType: 'image/jpeg',
            originalSize: file.size,
            convertedSize: resultBlob.size,
            converted: true
        });

    } catch (error) {
        console.error('[HEIC Worker] Conversion failed:', error);

        // Return original file on error (better than nothing)
        self.postMessage({
            id,
            success: true,
            file: file,
            converted: false,
            error: error.message || 'Conversion failed'
        });
    }
};

console.log('[HEIC Worker] Worker initialized');
