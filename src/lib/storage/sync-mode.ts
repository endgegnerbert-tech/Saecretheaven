/**
 * Sync Mode Switching - PWA vs Tauri
 *
 * Phase 3: Automatically switches between:
 * - Mode A (PWA): Central Gateway (Pinata/Cloudflare)
 * - Mode B (Tauri): Direct Peer-to-Peer (Local IPFS node)
 *
 * This module detects the runtime environment and configures
 * the appropriate storage backend.
 */

// Sync mode types
export type SyncMode = 'gateway' | 'local' | 'hybrid';

// Storage backend types
export type StorageBackend = 'pinata' | 'local-ipfs' | 'hybrid';

// Sync configuration
export interface SyncConfig {
    mode: SyncMode;
    storageBackend: StorageBackend;
    useLocalNode: boolean;
    usePinataBackup: boolean;
    features: {
        p2pSync: boolean;
        offlineFirst: boolean;
        localEncryption: boolean;
    };
}

/**
 * Detect if running in Tauri desktop environment
 */
export function isTauri(): boolean {
    if (typeof window === 'undefined') return false;
    return '__TAURI__' in window;
}

/**
 * Detect if running as installed PWA
 */
export function isInstalledPWA(): boolean {
    if (typeof window === 'undefined') return false;

    // Check for standalone display mode (Android/Desktop)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // Check for iOS standalone mode
    const isIOSStandalone = 'standalone' in window.navigator &&
                            (window.navigator as { standalone?: boolean }).standalone === true;

    return isStandalone || isIOSStandalone;
}

/**
 * Detect if the device is mobile
 */
export function isMobile(): boolean {
    if (typeof window === 'undefined') return false;

    const ua = navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod|android|mobile/.test(ua);
}

/**
 * Get the current sync configuration based on runtime environment
 */
export function getSyncConfig(): SyncConfig {
    // Tauri Desktop: Use local IPFS node with Pinata backup
    if (isTauri()) {
        return {
            mode: 'hybrid',
            storageBackend: 'hybrid',
            useLocalNode: true,
            usePinataBackup: true,
            features: {
                p2pSync: true,
                offlineFirst: true,
                localEncryption: true,
            },
        };
    }

    // PWA Mode: Use Pinata gateway
    return {
        mode: 'gateway',
        storageBackend: 'pinata',
        useLocalNode: false,
        usePinataBackup: true,
        features: {
            p2pSync: false, // P2P not available in browser
            offlineFirst: true, // IndexedDB caching
            localEncryption: true, // Client-side encryption
        },
    };
}

/**
 * Check if a specific feature is available
 */
export function isFeatureAvailable(feature: keyof SyncConfig['features']): boolean {
    const config = getSyncConfig();
    return config.features[feature];
}

/**
 * Get the Tauri API if available
 */
export function getTauriApi(): unknown | null {
    if (!isTauri()) return null;
    return (window as unknown as { __TAURI__: unknown }).__TAURI__;
}

/**
 * Runtime environment info
 */
export interface RuntimeInfo {
    isTauri: boolean;
    isInstalledPWA: boolean;
    isMobile: boolean;
    isBrowser: boolean;
    platform: 'tauri' | 'pwa-installed' | 'pwa-browser' | 'browser';
}

/**
 * Get detailed runtime environment information
 */
export function getRuntimeInfo(): RuntimeInfo {
    const tauri = isTauri();
    const installedPWA = isInstalledPWA();
    const mobile = isMobile();

    let platform: RuntimeInfo['platform'];
    if (tauri) {
        platform = 'tauri';
    } else if (installedPWA) {
        platform = 'pwa-installed';
    } else if (mobile) {
        platform = 'pwa-browser';
    } else {
        platform = 'browser';
    }

    return {
        isTauri: tauri,
        isInstalledPWA: installedPWA,
        isMobile: mobile,
        isBrowser: typeof window !== 'undefined',
        platform,
    };
}

/**
 * Log current sync configuration (for debugging)
 */
export function logSyncConfig(): void {
    const config = getSyncConfig();
    const runtime = getRuntimeInfo();

    console.log('[SyncMode] Runtime:', runtime);
    console.log('[SyncMode] Config:', config);
}
