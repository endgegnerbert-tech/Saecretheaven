/**
 * useRealtimeSync Hook - Real-time sync across devices via Supabase
 */

'use client';

import { useEffect, useCallback, useState } from 'react';
import { supabase, loadCIDsFromSupabase, type PhotoMetadata as SupabasePhotoMetadata } from '@/lib/supabase';
import { getDeviceId } from '@/lib/deviceId';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface SyncedPhoto {
  cid: string;
  device_id: string;
  uploaded_at: string;
  file_size_bytes: number | null;
  isFromOtherDevice: boolean;
}

interface UseRealtimeSyncOptions {
  onNewPhoto?: (photo: SyncedPhoto) => void;
  onPhotoDeleted?: (cid: string) => void;
  enabled?: boolean;
}

export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const { onNewPhoto, onPhotoDeleted, enabled = true } = options;
  const [remoteCIDs, setRemoteCIDs] = useState<SyncedPhoto[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<Error | null>(null);

  const deviceId = typeof window !== 'undefined' ? getDeviceId() : 'server';

  // Load initial CIDs from Supabase
  const loadRemoteCIDs = useCallback(async () => {
    try {
      const data = await loadCIDsFromSupabase(deviceId);
      const photos: SyncedPhoto[] = data.map((row) => ({
        cid: row.cid,
        device_id: row.device_id,
        uploaded_at: row.uploaded_at,
        file_size_bytes: row.file_size_bytes,
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
            };

            const syncedPhoto: SyncedPhoto = {
              cid: newPhoto.cid,
              device_id: newPhoto.device_id,
              uploaded_at: newPhoto.uploaded_at,
              file_size_bytes: newPhoto.file_size_bytes,
              isFromOtherDevice: newPhoto.device_id !== deviceId,
            };

            // Only notify if it's from another device
            if (syncedPhoto.isFromOtherDevice) {
              console.log('New photo received from another device:', syncedPhoto.cid);
              onNewPhoto?.(syncedPhoto);
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
  }, [enabled, deviceId, onNewPhoto, onPhotoDeleted, loadRemoteCIDs]);

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
    lastSyncError,
    refresh,
    deviceId,
  };
}
