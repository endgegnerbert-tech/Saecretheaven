# PhotoVault: PRD & Master Plan (MVP Edition)

> [!IMPORTANT]
> **Strict Context**: This document defines the MVP scope.
> **MVP Goal**: A fully functional, decentralized, encrypted photo storage with multi-device sync.
> **Excluded from MVP**: AI Face Recognition, Semantic Search (Phase 3+).

---

## 1. Product Requirements Document (PRD)

### Product Promise
**"Photos dezentral verschlüsselt, nur Metadaten zentral."**

### Data Architecture
1.  **Encrypted Photos (Content)**:
    -   Client-side encryption (`tweetnacl`) 🔒.
    -   Storage: **IPFS** / **Web3.storage** (Decentralized) 🌐.
    -   Result: Only CID (Hash) + Encrypted Blob leaves the device.
    -   *Note*: Local IPFS node (Tauri) for redundancy in later desktop versions.
2.  **Metadata (Supabase)**:
    -   Minimal structure: CID, Date, Size, DeviceID.
    -   Flags: `pinned_locally`, `pinned_remote`.
    -   **Zero Knowledge**: No keys, no plain image data.

### Core Value Props (MVP)
1.  **Zero-Knowledge Encryption**: User owns the transmission key.
2.  **Decentralized Storage**: Resilient storage via IPFS/Filecoin protocols.
3.  **Multi-Device Sync**: Real-time sync of library state between devices without a central cloud "account" holding the data.

---

## 2. Implementation Status & Roadmap

### ✅ Phase 1: Foundation (Completed)
-   **Core**: Next.js 15 Environment.
-   **Crypto**: `src/lib/crypto.ts` (tweetnacl wrapper).
-   **Local DB**: `src/lib/storage/local-db.ts` (Dexie.js).
-   **UI**: Dashboard, Basic Upload UI.

### 🚧 Phase 2: The "Real" Sync (Current Focus)
*Missing link to make the app usable across devices.*

#### 2.1 Metadata Sync (Supabase)
-   **Status**: ✅ Implemented (`useRealtimeSync.ts`).
-   **Function**: Devices know *about* files on other devices.

#### 2.2 Content Sync (Remote Pinning)
-   **Status**: ❌ Pending.
-   **Requirement**:
    -   Upload encrypted blobs to Decentralized Storage (Web3.storage) or Supabase Storage (Blob Store) as a bridge.
    -   Store mapping: `CID` -> `Storage URL` (or retrieve via IPFS Gateway).
    -   **Action**: Create `src/lib/storage/remote-storage.ts`.

#### 2.3 Key Exchange (Device Pairing)
-   **Status**: ❌ Pending.
-   **Requirement**: Device B cannot decrypt pics from Device A without the Secret Key.
-   **Feature**:
    -   **Export**: Show Private Key as QR Code (`qrcode.react`).
    -   **Import**: Scan/Enter Key on new device.
    -   **Action**: Create Key Management UI.

### 🔮 Phase 3: Future / Post-MVP
*Explicitly excluded from current sprint.*
-   **AI Intelligence**: Face Detection (`face-api.js`), Vector Search.
-   **Tauri Desktop App**: Native filesystem integration, Background Sync.

---

## 3. Technical Implementation Plan (Immediate Next Steps)

### Step 1: Fix Content Sync (Remote Pinning)
We need a place to put the encrypted blobs so Device B can download them.
1.  **Storage Provider**: Use Supabase Storage (Bucket: `vault`) as the primary "Remote Pin" for MVP stability, or pure Web3.storage if API keys are provided. *Decision: Start with Supabase Storage for speed, interface it as a "Remote Pin".*
2.  **Upload Logic**:
    -   On `savePhoto`: Encrypt -> Local DB -> **Background Upload**.
    -   Update `photos_metadata` table: Set `pinned_remote = true`.
3.  **Download Logic**:
    -   `useRealtimeSync` detects new CID.
    -   Check Local DB (Missing?).
    -   Fetch Encrypted Blob from Storage.
    -   Decrypt with Local Key -> Store in Local DB.

### Step 2: Implement Key Exchange
1.  **Install**: `npm install qrcode.react`.
2.  **UI**: Add "Link Device" button in Dashboard.
3.  **Flow**:
    -   User A: "Reveal Key" -> Auth Check -> Show QR.
    -   User B: Onboarding -> "I have a key" -> Input/Scan.

---
**Codebase Verification Notes**:
-   `src/lib/ipfs.ts` does not exist yet. Needs creation or folding into `remote-storage.ts`.
-   `crypto.ts` is ready
-   `useRealtimeSync.ts` handles metadata but needs triggers for content download.
