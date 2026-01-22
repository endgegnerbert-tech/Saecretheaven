import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for our tables
export interface PhotoMetadata {
  id?: string
  cid: string
  device_id: string
  file_size_bytes?: number
  faces_count?: number
  pinned_locally?: boolean
  pinned_remote?: boolean
  uploaded_at?: string
  user_key_hash?: string
}

export interface Device {
  id?: string
  device_name: string
  device_type?: string
  public_key?: string
  created_at?: string
}

// Helper: Upload CID metadata to Supabase
export async function uploadCIDMetadata(cid: string, fileSize: number, deviceId: string) {
  const { data, error } = await supabase
    .from('photos_metadata')
    .insert([{
      cid,
      file_size_bytes: fileSize,
      device_id: deviceId,
      pinned_locally: true
    }])
    .select()

  if (error) {
    console.error('Supabase Upload Error:', error)
    throw error
  }
  return data
}

// Helper: Load all CIDs from Supabase
export async function loadCIDsFromSupabase(currentDeviceId?: string) {
  const { data, error } = await supabase
    .from('photos_metadata')
    .select('cid, device_id, uploaded_at, file_size_bytes')
    .order('uploaded_at', { ascending: false })

  if (error) {
    console.error('Supabase Load Error:', error)
    throw error
  }
  return data || []
}

// Helper: Check if CID already exists in Supabase
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

// Helper: Register device
export async function registerDevice(deviceName: string, deviceType?: string) {
  const { data, error } = await supabase
    .from('devices')
    .insert([{
      device_name: deviceName,
      device_type: deviceType
    }])
    .select()

  if (error) {
    console.error('Supabase Device Registration Error:', error)
    throw error
  }
  return data?.[0]
}
