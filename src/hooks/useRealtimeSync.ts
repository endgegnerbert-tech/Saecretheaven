/**
 * useRealtimeSync Hook - Real-time METADATA sync across devices via Supabase
 *
 * This is a "thin" sync layer - it ONLY syncs metadata (CIDs, nonce, etc.)
 * The actual photo content stays on IPFS and is fetched on-demand by the UI
 */

'use client';

import { useEffect, useCallback, useState } from 'react';
import { supabase, loadCIDsFromSupabase } from '@/lib/supabase';
import { getDeviceId } from '@/lib/deviceId';
import { getUserKeyHash } from '@/lib/crypto';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface SyncedPhoto {
  cid: string;
  device_id: string;
  uploaded_at: string;
  file_size_bytes: number | null;
  nonce: string | null;
  mime_type: string | null;
  isFromOtherDevice: boolean;
}

interface UseRealtimeSyncOptions {
  onNewPhoto?: (photo: SyncedPhoto) => void;
  onPhotoDeleted?: (cid: string) => void;
  enabled?: boolean;
  secretKey?: Uint8Array | null;
}

export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const { onNewPhoto, onPhotoDeleted, enabled = true, secretKey } = options;
  const [remoteCIDs, setRemoteCIDs] = useState<SyncedPhoto[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<Error | null>(null);
  const [userKeyHash, setUserKeyHash] = useState<string | null>(null);

  const deviceId = typeof window !== 'undefined' ? getDeviceId() : 'server';

  // Generate Key Hash when secretKey changes
  useEffect(() => {
    if (secretKey) {
      getUserKeyHash(secretKey).then(setUserKeyHash);
    } else {
      setUserKeyHash(null);
    }
  }, [secretKey]);

  // Device registration is now handled centrally in PhotoVaultApp.tsx
  // to prevent duplicate registrations across hooks

  // Load initial CIDs from Supabase (metadata only)
  const loadRemoteCIDs = useCallback(async () => {
    if (!userKeyHash) return [];

    try {
      const data = await loadCIDsFromSupabase(deviceId, userKeyHash);
      const photos: SyncedPhoto[] = data.map((row) => ({
        cid: row.cid,
        device_id: row.device_id,
        uploaded_at: row.uploaded_at,
        file_size_bytes: row.file_size_bytes,
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
  }, [deviceId, userKeyHash]);

  // Subscribe to realtime changes (metadata only - no auto-download)
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
              nonce: string | null;
              mime_type: string | null;
              user_key_hash: string | null;
            };

            // Only process if it belongs to this user
            if (userKeyHash && newPhoto.user_key_hash !== userKeyHash) {
              return;
            }

            const syncedPhoto: SyncedPhoto = {
              cid: newPhoto.cid,
              device_id: newPhoto.device_id,
              uploaded_at: newPhoto.uploaded_at,
              file_size_bytes: newPhoto.file_size_bytes,
              nonce: newPhoto.nonce,
              mime_type: newPhoto.mime_type,
              isFromOtherDevice: newPhoto.device_id !== deviceId,
            };

            // Notify callback (for UI updates like toasts)
            if (syncedPhoto.isFromOtherDevice) {
              console.log('New photo metadata received from another device:', syncedPhoto.cid);
              onNewPhoto?.(syncedPhoto);
            }

            // Add to local metadata state (NOT downloading content)
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
          console.log('[Realtime] Status:', status);
          setIsConnected(status === 'SUBSCRIBED');

          // Auto-reconnect on channel error
          if (status === 'CHANNEL_ERROR') {
            console.log('[Realtime] Channel error, retrying in 5s...');
            setTimeout(() => {
              if (channel) {
                channel.subscribe();
              }
            }, 5000);
          }
        });
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [enabled, deviceId, userKeyHash, onNewPhoto, onPhotoDeleted, loadRemoteCIDs]);

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
    userKeyHash,
  };
}
