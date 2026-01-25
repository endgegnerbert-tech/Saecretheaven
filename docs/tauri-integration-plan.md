# Tauri Desktop Integration Plan

## Phase 2: Native & Performance Optimization

This document outlines the architecture for integrating PhotoVault with Tauri for native desktop support.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    PhotoVault Tauri App                         │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React/Next.js)                                       │
│  ├── Same codebase as PWA                                       │
│  ├── Feature detection for Tauri APIs                          │
│  └── Conditional imports for native modules                     │
├─────────────────────────────────────────────────────────────────┤
│  Tauri Bridge (invoke/listen)                                   │
│  ├── Keychain access                                            │
│  ├── Local IPFS node control                                    │
│  └── Native file system access                                  │
├─────────────────────────────────────────────────────────────────┤
│  Rust Backend                                                   │
│  ├── Keychain integration (keyring crate)                       │
│  ├── iroh/ipfs-embed local node                                 │
│  └── Native encryption (ring crate)                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Keychain Bridge (Secure Key Storage)

### Purpose
Store the encryption secret key in the OS-level secure storage instead of localStorage.

### Rust Implementation

```rust
// src-tauri/src/keychain.rs
use keyring::Entry;

const SERVICE_NAME: &str = "photovault";

#[tauri::command]
pub fn store_secret_key(user_id: &str, key_base64: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, user_id)
        .map_err(|e| format!("Keyring error: {}", e))?;

    entry.set_password(key_base64)
        .map_err(|e| format!("Failed to store key: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn get_secret_key(user_id: &str) -> Result<Option<String>, String> {
    let entry = Entry::new(SERVICE_NAME, user_id)
        .map_err(|e| format!("Keyring error: {}", e))?;

    match entry.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to get key: {}", e)),
    }
}

#[tauri::command]
pub fn delete_secret_key(user_id: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, user_id)
        .map_err(|e| format!("Keyring error: {}", e))?;

    entry.delete_password()
        .map_err(|e| format!("Failed to delete key: {}", e))?;

    Ok(())
}
```

### TypeScript Bridge

```typescript
// src/lib/tauri/keychain.ts
import { invoke } from '@tauri-apps/api/tauri';

export async function storeSecretKey(userId: string, keyBase64: string): Promise<void> {
    await invoke('store_secret_key', { userId, keyBase64 });
}

export async function getSecretKey(userId: string): Promise<string | null> {
    return await invoke('get_secret_key', { userId });
}

export async function deleteSecretKey(userId: string): Promise<void> {
    await invoke('delete_secret_key', { userId });
}
```

---

## 2. Local IPFS Node (Eliminate Pinata Costs)

### Purpose
Run a local IPFS node for the desktop app to:
1. Eliminate Pinata upload costs
2. Enable direct peer-to-peer sync between devices
3. Provide faster local access

### Recommended: iroh (Rust-native IPFS)

```rust
// src-tauri/src/ipfs.rs
use iroh::{node::Node, rpc::client::blobs::AddOutcome};
use std::path::PathBuf;

pub struct IpfsNode {
    node: Node,
}

impl IpfsNode {
    pub async fn new(data_dir: PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        let node = Node::persistent(data_dir).await?;
        Ok(Self { node })
    }

    pub async fn add_blob(&self, data: Vec<u8>) -> Result<String, Box<dyn std::error::Error>> {
        let outcome = self.node.blobs().add_bytes(data).await?;
        Ok(outcome.hash.to_string())
    }

    pub async fn get_blob(&self, cid: &str) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let hash = cid.parse()?;
        let data = self.node.blobs().read_to_bytes(hash).await?;
        Ok(data.to_vec())
    }
}
```

### Tauri Commands

```rust
// src-tauri/src/commands/ipfs.rs
use tauri::State;
use crate::ipfs::IpfsNode;

#[tauri::command]
pub async fn ipfs_upload(
    data: Vec<u8>,
    state: State<'_, IpfsNode>
) -> Result<String, String> {
    state.add_blob(data).await
        .map_err(|e| format!("IPFS upload failed: {}", e))
}

#[tauri::command]
pub async fn ipfs_download(
    cid: String,
    state: State<'_, IpfsNode>
) -> Result<Vec<u8>, String> {
    state.get_blob(&cid).await
        .map_err(|e| format!("IPFS download failed: {}", e))
}
```

---

## 3. Device ID Persistence

### Purpose
Ensure device ID remains identical between browser and Tauri app mode.

### Implementation
Use Tauri's app data directory for consistent storage:

```rust
// src-tauri/src/device.rs
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

#[tauri::command]
pub fn get_device_id(app_handle: tauri::AppHandle) -> Result<String, String> {
    let app_dir = app_handle.path_resolver()
        .app_data_dir()
        .ok_or("Failed to get app data dir")?;

    let device_file = app_dir.join("device_id");

    if device_file.exists() {
        fs::read_to_string(&device_file)
            .map_err(|e| format!("Failed to read device ID: {}", e))
    } else {
        let device_id = Uuid::new_v4().to_string();
        fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create app dir: {}", e))?;
        fs::write(&device_file, &device_id)
            .map_err(|e| format!("Failed to write device ID: {}", e))?;
        Ok(device_id)
    }
}
```

---

## 4. Sync Mode Switching

### Purpose
Auto-switch between:
- **Mode A (PWA)**: Central Gateway (Pinata/Cloudflare)
- **Mode B (Tauri)**: Direct Peer-to-Peer (Local IPFS)

### TypeScript Implementation

```typescript
// src/lib/storage/sync-mode.ts
import { isTauri } from '@/lib/tauri/detect';

export type SyncMode = 'gateway' | 'local' | 'hybrid';

export interface SyncConfig {
    mode: SyncMode;
    useLocalNode: boolean;
    usePinataBackup: boolean;
}

export function getSyncConfig(): SyncConfig {
    if (isTauri()) {
        return {
            mode: 'hybrid',
            useLocalNode: true,
            usePinataBackup: true, // Keep Pinata as backup
        };
    }

    return {
        mode: 'gateway',
        useLocalNode: false,
        usePinataBackup: true,
    };
}
```

---

## 5. Project Structure

```
photovault/
├── src/                          # Existing React app
│   └── lib/
│       └── tauri/               # Tauri-specific code
│           ├── detect.ts        # Feature detection
│           ├── keychain.ts      # Keychain bridge
│           ├── ipfs.ts          # Local IPFS bridge
│           └── device.ts        # Device ID bridge
├── src-tauri/                   # Tauri Rust backend
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/
│       ├── main.rs
│       ├── keychain.rs
│       ├── ipfs.rs
│       ├── device.rs
│       └── commands/
│           └── mod.rs
└── docs/
    └── tauri-integration-plan.md
```

---

## 6. Cargo Dependencies

```toml
# src-tauri/Cargo.toml
[dependencies]
tauri = { version = "1.5", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Secure key storage
keyring = "2.0"

# Local IPFS node
iroh = "0.12"

# UUID generation
uuid = { version = "1.6", features = ["v4"] }

# Async runtime
tokio = { version = "1", features = ["full"] }
```

---

## 7. Feature Detection

```typescript
// src/lib/tauri/detect.ts
export function isTauri(): boolean {
    return typeof window !== 'undefined' &&
           '__TAURI__' in window;
}

export function getTauriApi() {
    if (!isTauri()) return null;
    return (window as any).__TAURI__;
}
```

---

## 8. Implementation Phases

### Phase 1: Basic Integration
1. Set up Tauri project structure
2. Implement keychain bridge
3. Replace localStorage key storage with keychain in Tauri mode

### Phase 2: Local IPFS
1. Integrate iroh as local IPFS node
2. Implement upload/download through local node
3. Add Pinata as backup for redundancy

### Phase 3: P2P Sync
1. Implement device discovery via iroh
2. Direct peer-to-peer photo sync
3. Conflict resolution for simultaneous uploads

---

## 9. Build Commands

```bash
# Development
npm run tauri dev

# Build for macOS
npm run tauri build -- --target universal-apple-darwin

# Build for Windows
npm run tauri build -- --target x86_64-pc-windows-msvc

# Build for Linux
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

---

## 10. Security Considerations

1. **Keychain Access**: Use biometric unlock on supported devices
2. **Local Node**: Encrypted at rest using device keychain
3. **P2P Sync**: Only sync with devices sharing the same vault_key_hash
4. **Code Signing**: Sign all desktop builds for distribution
