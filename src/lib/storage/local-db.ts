/**
 * Local Database - Dexie.js Wrapper für Photo Metadata
 * Speichert CIDs und Metadaten lokal (offline-first)
 *
 * WICHTIG: iOS Safari hat Probleme mit Blob-Storage in IndexedDB.
 * Wir speichern Blobs als ArrayBuffer und konvertieren beim Lesen zurück.
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

export class PhotoVaultDB extends Dexie {
    photos!: Table<PhotoStorageRecord, number>;

    constructor() {
        super('PhotoVaultDB');

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
