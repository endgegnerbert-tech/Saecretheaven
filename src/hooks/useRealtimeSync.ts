/**
 * useRealtimeSync Hook - Real-time METADATA sync across devices via Supabase
 *
 * This is a "thin" sync layer - it ONLY syncs metadata (CIDs, nonce, etc.)
 * The actual photo content stays on IPFS and is fetched on-demand by the UI
 *
 * PHASE 3 FIXES:
 * - Fixed race conditions with proper ref usage
 * - Added debouncing for rapid events
 * - Separated subscription setup from data loading
 * - Proper cleanup on unmount
 */

'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
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

  // Refs to avoid stale closures in callbacks
  const userKeyHashRef = useRef<string | null>(null);
  const deviceIdRef = useRef<string>('server');
  const onNewPhotoRef = useRef(onNewPhoto);
  const onPhotoDeletedRef = useRef(onPhotoDeleted);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);

  // Update refs when values change
  useEffect(() => {
    onNewPhotoRef.current = onNewPhoto;
    onPhotoDeletedRef.current = onPhotoDeleted;
  }, [onNewPhoto, onPhotoDeleted]);

  // Initialize device ID (only on client)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      deviceIdRef.current = getDeviceId();
    }
  }, []);

  // Generate Key Hash when secretKey changes
  useEffect(() => {
    let isMounted = true;

    if (secretKey) {
      getUserKeyHash(secretKey).then((hash) => {
        if (isMounted) {
          setUserKeyHash(hash);
          userKeyHashRef.current = hash;
        }
      });
    } else {
      setUserKeyHash(null);
      userKeyHashRef.current = null;
    }

    return () => {
      isMounted = false;
    };
  }, [secretKey]);

  // Load initial CIDs from Supabase (metadata only)
  // Using ref for userKeyHash to avoid recreating callback
  const loadRemoteCIDs = useCallback(async () => {
    const currentKeyHash = userKeyHashRef.current;
    const currentDeviceId = deviceIdRef.current;

    if (!currentKeyHash) return [];

    try {
      const data = await loadCIDsFromSupabase(currentDeviceId, currentKeyHash);
      const photos: SyncedPhoto[] = data.map((row: { cid: string; device_id: string; uploaded_at: string; file_size_bytes: number | null; nonce: string | null; mime_type: string | null }) => ({
        cid: row.cid,
        device_id: row.device_id,
        uploaded_at: row.uploaded_at,
        file_size_bytes: row.file_size_bytes,
        nonce: row.nonce || null,
        mime_type: row.mime_type || null,
        isFromOtherDevice: row.device_id !== currentDeviceId,
      }));
      setRemoteCIDs(photos);
      setLastSyncError(null);
      return photos;
    } catch (error) {
      console.error('Failed to load remote CIDs:', error);
      setLastSyncError(error as Error);
      return [];
    }
  }, []); // Empty deps - uses refs

  // Load data when userKeyHash becomes available
  useEffect(() => {
    if (userKeyHash && enabled) {
      loadRemoteCIDs();
    }
  }, [userKeyHash, enabled, loadRemoteCIDs]);

  // Subscribe to realtime changes - SEPARATE from data loading
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Don't subscribe if already subscribed
    if (isSubscribedRef.current) return;

    // Wait for userKeyHash to be ready before subscribing
    if (!userKeyHash) return;

    console.log('[Realtime] Setting up subscription...');
    isSubscribedRef.current = true;

    // Debounce helper for rapid events
    let eventQueue: SyncedPhoto[] = [];
    let debounceTimer: NodeJS.Timeout | null = null;

    const processEventQueue = () => {
      if (eventQueue.length === 0) return;

      setRemoteCIDs((prev) => {
        const newPhotos = eventQueue.filter(
          (photo) => !prev.some((p) => p.cid === photo.cid)
        );
        if (newPhotos.length === 0) return prev;
        return [...newPhotos, ...prev];
      });

      // Notify callbacks for photos from other devices
      eventQueue
        .filter((p) => p.isFromOtherDevice)
        .forEach((photo) => {
          console.log('[Realtime] New photo from another device:', photo.cid);
          onNewPhotoRef.current?.(photo);
        });

      eventQueue = [];
    };

    const channel = supabase
      .channel(`photos_metadata_${userKeyHash.slice(0, 8)}`)
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
          const currentKeyHash = userKeyHashRef.current;
          if (currentKeyHash && newPhoto.user_key_hash !== currentKeyHash) {
            return;
          }

          const syncedPhoto: SyncedPhoto = {
            cid: newPhoto.cid,
            device_id: newPhoto.device_id,
            uploaded_at: newPhoto.uploaded_at,
            file_size_bytes: newPhoto.file_size_bytes,
            nonce: newPhoto.nonce,
            mime_type: newPhoto.mime_type,
            isFromOtherDevice: newPhoto.device_id !== deviceIdRef.current,
          };

          // Add to queue for debounced processing
          eventQueue.push(syncedPhoto);

          // Debounce: process after 100ms of no new events
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(processEventQueue, 100);
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
          onPhotoDeletedRef.current?.(deleted.cid);
          setRemoteCIDs((prev) => prev.filter((p) => p.cid !== deleted.cid));
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Status:', status);
        setIsConnected(status === 'SUBSCRIBED');

        // Auto-reconnect on channel error with exponential backoff
        if (status === 'CHANNEL_ERROR') {
          console.log('[Realtime] Channel error, retrying in 5s...');
          setTimeout(() => {
            if (channelRef.current && isSubscribedRef.current) {
              channelRef.current.subscribe();
            }
          }, 5000);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('[Realtime] Cleaning up subscription...');
      isSubscribedRef.current = false;

      if (debounceTimer) clearTimeout(debounceTimer);

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, userKeyHash]); // Only depend on enabled and userKeyHash

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
    deviceId: deviceIdRef.current,
    userKeyHash,
  };
}
