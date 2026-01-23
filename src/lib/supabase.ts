/**
 * Supabase Layer - Metadata-Only Storage
 * Supabase stores ONLY photo metadata and device info, NOT the actual content
 * Content is stored on IPFS (see ipfs.ts and remote-storage.ts)
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for our tables
export interface PhotoMetadata {
    id?: string
    cid: string              // IPFS Content Identifier (the actual photo is on IPFS)
    device_id: string        // Which device uploaded this
    file_size_bytes?: number // Original file size
    nonce?: string           // Encryption nonce (Base64)
    mime_type?: string       // Original MIME type
    user_key_hash?: string   // Hash of user's encryption key (for multi-device sync)
    uploaded_at?: string     // When it was uploaded
}

export interface Device {
    id?: string
    device_name: string
    device_type?: string
    user_key_hash?: string   // Links device to user's encryption key
    created_at?: string
}

/**
 * Upload photo metadata to Supabase (metadata only, NOT the actual photo)
 * The actual encrypted photo is stored on IPFS
 */
export async function uploadCIDMetadata(
    cid: string,
    fileSize: number,
    deviceId: string,
    nonce?: string,
    mimeType?: string,
    userKeyHash?: string
) {
    const { data, error } = await supabase
        .from('photos_metadata')
        .insert([{
            cid,
            file_size_bytes: fileSize,
            device_id: deviceId,
            nonce,
            mime_type: mimeType,
            user_key_hash: userKeyHash
        }])
        .select()

    if (error) {
        console.error('Supabase Metadata Upload Error:', error)
        throw error
    }
    return data
}

/**
 * Load all photo CIDs from Supabase for a user
 * Photos are identified by CID and can be fetched from IPFS
 */
export async function loadCIDsFromSupabase(_currentDeviceId: string, userKeyHash?: string) {
    let query = supabase
        .from('photos_metadata')
        .select('cid, device_id, uploaded_at, file_size_bytes, nonce, mime_type')

    if (userKeyHash) {
        query = query.eq('user_key_hash', userKeyHash)
    }

    const { data, error } = await query.order('uploaded_at', { ascending: false })

    if (error) {
        console.error('Supabase Load Error:', error)
        throw error
    }
    return data || []
}

/**
 * Check if CID already exists in Supabase
 */
export async function cidExistsInSupabase(cid: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('photos_metadata')
        .select('id')
        .eq('cid', cid)
        .single()

    if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is expected
        console.error('Supabase Check Error:', error)
    }
    return !!data
}

/**
 * Delete photo metadata from Supabase
 */
export async function deletePhotoMetadata(cid: string): Promise<void> {
    const { error } = await supabase
        .from('photos_metadata')
        .delete()
        .eq('cid', cid)

    if (error) {
        console.error('Supabase Delete Error:', error)
        throw error
    }
}

/**
 * Register or update a device
 */
export async function registerDevice(id: string, deviceName: string, deviceType?: string, userKeyHash?: string) {
    const { data, error } = await supabase
        .from('devices')
        .upsert([{
            id,
            device_name: deviceName,
            device_type: deviceType,
            user_key_hash: userKeyHash
        }], { onConflict: 'id' })
        .select()

    if (error) {
        console.error('Supabase Device Registration Error:', error)
        throw error
    }
    return data?.[0]
}

/**
 * Get all devices for a user (by user_key_hash)
 */
export async function getDevicesForUser(userKeyHash: string): Promise<Device[]> {
    const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_key_hash', userKeyHash)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Supabase Get Devices Error:', error)
        throw error
    }
    return data || []
}

/**
 * Get photo metadata by CID
 */
export async function getPhotoMetadataByCID(cid: string): Promise<PhotoMetadata | null> {
    const { data, error } = await supabase
        .from('photos_metadata')
        .select('*')
        .eq('cid', cid)
        .single()

    if (error && error.code !== 'PGRST116') {
        console.error('Supabase Get Photo Error:', error)
        throw error
    }

    return data
}
