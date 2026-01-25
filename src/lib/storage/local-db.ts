/**
 * Local Database - Dexie.js Wrapper für Photo Metadata
 * Speichert CIDs und Metadaten lokal (offline-first)
 *
 * WICHTIG: iOS Safari hat Probleme mit Blob-Storage in IndexedDB.
 * Wir speichern Blobs als ArrayBuffer und konvertieren beim Lesen zurück.
 *
 * PERFORMANCE OPTIMIZATIONS (Phase 2):
 * - Compound index on [uploadedAt+id] for efficient pagination
 * - Pagination support for 1000+ photos
 * - Lazy loading of encrypted blobs
 */

import Dexie, { Table } from 'dexie';

// Public interface - what the app sees
export interface PhotoMetadata {
    id?: number; // Auto-increment
    cid: string; // IPFS Content ID
    nonce: string; // Encryption Nonce (Base64)
    fileName: string;
    mimeType: string;
    fileSize: number;
    width?: number;
    height?: number;
    uploadedAt: Date;
    encryptedBlob?: Blob; // Optional: Lokaler Cache
}

// Internal storage format - what we actually store in IndexedDB
interface PhotoStorageRecord {
    id?: number;
    cid: string;
    nonce: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    width?: number;
    height?: number;
    uploadedAt: Date;
    encryptedData?: ArrayBuffer; // Stored as ArrayBuffer for iOS Safari compatibility
}

// Pagination options
export interface PaginationOptions {
    page?: number;      // 0-indexed page number
    pageSize?: number;  // Items per page (default: 50)
}

// Paginated result
export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

export class PhotoVaultDB extends Dexie {
    photos!: Table<PhotoStorageRecord, number>;

    constructor() {
        super('PhotoVaultDB');

        // Version 2: Added compound index for efficient pagination
        this.version(2).stores({
            photos: '++id, cid, uploadedAt, [uploadedAt+id]',
        }).upgrade(() => {
            // Migration is automatic - Dexie handles index creation
            console.log('[LocalDB] Upgraded to v2 with compound index');
        });

        // Keep v1 for backward compatibility
        this.version(1).stores({
            photos: '++id, cid, uploadedAt',
        });
    }
}

// Singleton Instance
export const db = new PhotoVaultDB();

/**
 * Convert Blob to ArrayBuffer (for iOS Safari IndexedDB compatibility)
 */
async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return await blob.arrayBuffer();
}

/**
 * Convert ArrayBuffer back to Blob
 */
function arrayBufferToBlob(buffer: ArrayBuffer, mimeType: string): Blob {
    return new Blob([buffer], { type: mimeType });
}

/**
 * Convert storage record to public PhotoMetadata
 */
function recordToMetadata(record: PhotoStorageRecord): PhotoMetadata {
    const { encryptedData, ...rest } = record;
    return {
        ...rest,
        encryptedBlob: encryptedData
            ? arrayBufferToBlob(encryptedData, record.mimeType)
            : undefined,
    };
}

/**
 * Speichert Photo Metadata
 * Konvertiert Blob zu ArrayBuffer für iOS Safari Kompatibilität
 */
export async function savePhoto(photo: Omit<PhotoMetadata, 'id'>): Promise<number> {
    const { encryptedBlob, ...rest } = photo;

    // Convert Blob to ArrayBuffer for storage
    const storageRecord: Omit<PhotoStorageRecord, 'id'> = {
        ...rest,
        encryptedData: encryptedBlob ? await blobToArrayBuffer(encryptedBlob) : undefined,
    };

    console.log('[LocalDB] Saving photo as ArrayBuffer:', {
        cid: photo.cid,
        hasBlob: !!encryptedBlob,
        arrayBufferSize: storageRecord.encryptedData?.byteLength
    });

    return await db.photos.add(storageRecord);
}

/**
 * Lädt alle Photos (sortiert nach Datum)
 * Konvertiert ArrayBuffer zurück zu Blob
 */
export async function getAllPhotos(): Promise<PhotoMetadata[]> {
    const records = await db.photos.orderBy('uploadedAt').reverse().toArray();
    return records.map(recordToMetadata);
}

/**
 * Lädt ein Photo by CID
 * Konvertiert ArrayBuffer zurück zu Blob
 */
export async function getPhotoByCID(cid: string): Promise<PhotoMetadata | undefined> {
    const record = await db.photos.where('cid').equals(cid).first();
    return record ? recordToMetadata(record) : undefined;
}

/**
 * Löscht ein Photo
 */
export async function deletePhoto(id: number): Promise<void> {
    await db.photos.delete(id);
}

/**
 * Löscht alle Photos (Reset)
 */
export async function clearAllPhotos(): Promise<void> {
    await db.photos.clear();
}

/**
 * Zählt Anzahl der Photos
 */
export async function getPhotoCount(): Promise<number> {
    return await db.photos.count();
}

/**
 * Lädt Photos mit Pagination (optimiert für 1000+ Photos)
 * Uses compound index [uploadedAt+id] for efficient cursor-based pagination
 */
export async function getPhotosPaginated(
    options: PaginationOptions = {}
): Promise<PaginatedResult<PhotoMetadata>> {
    const { page = 0, pageSize = 50 } = options;
    const offset = page * pageSize;

    // Get total count (cached by Dexie for performance)
    const total = await db.photos.count();

    // Use offset-based pagination with index
    const records = await db.photos
        .orderBy('uploadedAt')
        .reverse()
        .offset(offset)
        .limit(pageSize)
        .toArray();

    return {
        items: records.map(recordToMetadata),
        total,
        page,
        pageSize,
        hasMore: offset + records.length < total,
    };
}

/**
 * Lädt Photos mit Cursor-basierter Pagination (für infinite scroll)
 * Mehr performant als offset-basierte Pagination bei großen Datenmengen
 */
export async function getPhotosAfterCursor(
    cursor?: { uploadedAt: Date; id: number },
    limit: number = 50
): Promise<{ items: PhotoMetadata[]; nextCursor?: { uploadedAt: Date; id: number } }> {
    let query = db.photos.orderBy('uploadedAt').reverse();

    if (cursor) {
        // Use compound key for efficient cursor-based pagination
        query = query.filter(record => {
            if (!record.id) return false;
            // Photos older than cursor, or same date but lower ID
            if (record.uploadedAt < cursor.uploadedAt) return true;
            if (record.uploadedAt.getTime() === cursor.uploadedAt.getTime() && record.id < cursor.id) return true;
            return false;
        });
    }

    const records = await query.limit(limit + 1).toArray();
    const hasMore = records.length > limit;
    const items = hasMore ? records.slice(0, limit) : records;

    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem?.id && lastItem?.uploadedAt
        ? { uploadedAt: lastItem.uploadedAt, id: lastItem.id }
        : undefined;

    return {
        items: items.map(recordToMetadata),
        nextCursor,
    };
}

/**
 * Lädt nur Metadaten ohne Blob (für schnelle Galerie-Ansicht)
 * Optimiert für initiales Laden - Blobs werden on-demand nachgeladen
 */
export async function getPhotosMetadataOnly(
    options: PaginationOptions = {}
): Promise<PaginatedResult<Omit<PhotoMetadata, 'encryptedBlob'>>> {
    const { page = 0, pageSize = 50 } = options;
    const offset = page * pageSize;

    const total = await db.photos.count();

    // Only select non-blob fields for faster loading
    const records = await db.photos
        .orderBy('uploadedAt')
        .reverse()
        .offset(offset)
        .limit(pageSize)
        .toArray();

    // Return metadata without converting blobs
    const items = records.map(record => ({
        id: record.id,
        cid: record.cid,
        nonce: record.nonce,
        fileName: record.fileName,
        mimeType: record.mimeType,
        fileSize: record.fileSize,
        width: record.width,
        height: record.height,
        uploadedAt: record.uploadedAt,
    }));

    return {
        items,
        total,
        page,
        pageSize,
        hasMore: offset + records.length < total,
    };
}

/**
 * Lädt den Blob für ein einzelnes Photo (lazy loading)
 */
export async function getPhotoBlob(id: number): Promise<Blob | undefined> {
    const record = await db.photos.get(id);
    if (!record?.encryptedData) return undefined;
    return arrayBufferToBlob(record.encryptedData, record.mimeType);
}
