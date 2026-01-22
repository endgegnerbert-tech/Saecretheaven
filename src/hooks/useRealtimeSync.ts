/**
 * useRealtimeSync Hook - Real-time sync across devices via Supabase
 */

'use client';

import { useEffect, useCallback, useState } from 'react';
import { supabase, loadCIDsFromSupabase } from '@/lib/supabase';
import { remoteStorage } from '@/lib/storage/remote-storage';
import { getDeviceId } from '@/lib/deviceId';
import { getPhotoByCID, savePhoto } from '@/lib/storage/local-db';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface SyncedPhoto {
  cid: string;
  device_id: string;
  uploaded_at: string;
  file_size_bytes: number | null;
  storage_path: string | null;
  nonce: string | null;
  mime_type: string | null;
  isFromOtherDevice: boolean;
}

interface UseRealtimeSyncOptions {
  onNewPhoto?: (photo: SyncedPhoto) => void;
  onPhotoDeleted?: (cid: string) => void;
  onPhotoDownloaded?: (cid: string) => void;
  enabled?: boolean;
  secretKey?: Uint8Array | null;
}

export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const { onNewPhoto, onPhotoDeleted, onPhotoDownloaded, enabled = true, secretKey } = options;
  const [remoteCIDs, setRemoteCIDs] = useState<SyncedPhoto[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<Error | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const deviceId = typeof window !== 'undefined' ? getDeviceId() : 'server';

  // Fetch missing photo content from Supabase Storage
  const fetchMissingContent = useCallback(async (photo: SyncedPhoto) => {
    if (!secretKey || !photo.storage_path) return false;

    try {
      // Check if we already have this photo locally
      const localPhoto = await getPhotoByCID(photo.cid);
      if (localPhoto?.encryptedBlob) {
        console.log('Photo already exists locally:', photo.cid);
        return false;
      }

      console.log('Fetching missing photo from storage:', photo.cid);
      setIsSyncing(true);

      // Download encrypted blob from Remote Storage (Supabase/IPFS)
      const encryptedBlob = await remoteStorage.download(photo.storage_path);

      // Save to local IndexedDB (still encrypted)
      await savePhoto({
        cid: photo.cid,
        nonce: photo.nonce || '',
        fileName: `synced_${photo.cid}`,
        mimeType: photo.mime_type || 'image/jpeg',
        fileSize: photo.file_size_bytes || 0,
        uploadedAt: new Date(photo.uploaded_at),
        encryptedBlob: encryptedBlob,
      });

      console.log('Photo downloaded and saved locally:', photo.cid);
      onPhotoDownloaded?.(photo.cid);
      return true;
    } catch (error) {
      console.error('Failed to fetch missing content:', error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [secretKey, onPhotoDownloaded]);

  // Load initial CIDs from Supabase
  const loadRemoteCIDs = useCallback(async () => {
    try {
      const data = await loadCIDsFromSupabase(deviceId);
      const photos: SyncedPhoto[] = data.map((row) => ({
        cid: row.cid,
        device_id: row.device_id,
        uploaded_at: row.uploaded_at,
        file_size_bytes: row.file_size_bytes,
        storage_path: row.storage_path || null,
        nonce: row.nonce || null,
        mime_type: row.mime_type || null,
        isFromOtherDevice: row.device_id !== deviceId,
      }));
      setRemoteCIDs(photos);
      setLastSyncError(null);
      return photos;
    } catch (error) {
      console.error('Failed to load remote CIDs:', error);
      setLastSyncError(error as Error);
      return [];
    }
  }, [deviceId]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let channel: RealtimeChannel | null = null;

    const setupSubscription = async () => {
      // Initial load
      await loadRemoteCIDs();

      // Subscribe to INSERT events
      channel = supabase
        .channel('photos_metadata_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'photos_metadata',
          },
          (payload) => {
            const newPhoto = payload.new as {
              cid: string;
              device_id: string;
              uploaded_at: string;
              file_size_bytes: number | null;
              storage_path: string | null;
              nonce: string | null;
              mime_type: string | null;
            };

            const syncedPhoto: SyncedPhoto = {
              cid: newPhoto.cid,
              device_id: newPhoto.device_id,
              uploaded_at: newPhoto.uploaded_at,
              file_size_bytes: newPhoto.file_size_bytes,
              storage_path: newPhoto.storage_path,
              nonce: newPhoto.nonce,
              mime_type: newPhoto.mime_type,
              isFromOtherDevice: newPhoto.device_id !== deviceId,
            };

            // Only notify and fetch if it's from another device
            if (syncedPhoto.isFromOtherDevice) {
              console.log('New photo received from another device:', syncedPhoto.cid);
              onNewPhoto?.(syncedPhoto);

              // Auto-fetch the content if we have the key
              if (syncedPhoto.storage_path) {
                fetchMissingContent(syncedPhoto);
              }
            }

            // Add to local state
            setRemoteCIDs((prev) => {
              // Avoid duplicates
              if (prev.some((p) => p.cid === syncedPhoto.cid)) {
                return prev;
              }
              return [syncedPhoto, ...prev];
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'photos_metadata',
          },
          (payload) => {
            const deleted = payload.old as { cid: string };
            onPhotoDeleted?.(deleted.cid);
            setRemoteCIDs((prev) => prev.filter((p) => p.cid !== deleted.cid));
          }
        )
        .subscribe((status) => {
          console.log('Realtime subscription status:', status);
          setIsConnected(status === 'SUBSCRIBED');
        });
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [enabled, deviceId, onNewPhoto, onPhotoDeleted, loadRemoteCIDs, fetchMissingContent]);

  // Force refresh
  const refresh = useCallback(async () => {
    return loadRemoteCIDs();
  }, [loadRemoteCIDs]);

  // Get CIDs from other devices only
  const remoteCIDsFromOtherDevices = remoteCIDs.filter((p) => p.isFromOtherDevice);

  return {
    remoteCIDs,
    remoteCIDsFromOtherDevices,
    isConnected,
    isSyncing,
    lastSyncError,
    refresh,
    fetchMissingContent,
    deviceId,
  };
}
