# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
```

No test command is currently configured.

## Architecture Overview

PhotoVault is an **encrypted photo backup app** with a mobile-first iOS-style UI. The core principle is **client-side encryption first** - all photos are encrypted locally before any upload.

### Data Flow

```
User Photo → Encrypt (tweetnacl) → Store Local (IndexedDB) → Sync CID to Cloud (Supabase)
```

1. **Encryption Layer** (`src/lib/crypto.ts`): Uses tweetnacl for symmetric encryption. Keys stored in localStorage, recoverable via 12-word phrase.

2. **Local Storage** (`src/lib/storage/local-db.ts`): Dexie.js wrapper for IndexedDB. Stores encrypted photo blobs + metadata offline-first.

3. **Cloud Sync** (`src/lib/supabase.ts`): Only CID metadata syncs to Supabase, not the encrypted content. Enables multi-device photo list sync.

4. **Realtime** (`src/hooks/useRealtimeSync.ts`): Supabase Realtime subscription for live updates when photos are added from other devices.

### Key Hooks

- `useEncryption`: Key generation, storage, recovery phrase management
- `useGalleryData`: Photo CRUD with encryption + automatic Supabase sync
- `useRealtimeSync`: Cross-device realtime photo sync

### Main UI Components (src/components/photovault/)

- `PhotoVaultApp.tsx`: Root component, manages app state and navigation
- `OnboardingFlow.tsx`: 3-step setup (key creation, source, plan)
- `PhotoGallery.tsx`: Photo grid with upload, decrypt-on-demand
- `Dashboard.tsx`: Backup status and metrics
- `SettingsPanel.tsx`: Device management, security, plan settings

### State Management

Global app state is lifted to `PhotoVaultApp.tsx` and passed down. TanStack Query handles async data (photos). Supabase handles cloud state.

## Supabase Schema

Two tables with RLS enabled:

```sql
-- Photo metadata (not the encrypted content)
photos_metadata (
  id UUID PRIMARY KEY,
  cid TEXT UNIQUE,        -- Content identifier
  device_id TEXT,         -- Which device uploaded
  file_size_bytes BIGINT,
  pinned_locally BOOLEAN,
  uploaded_at TIMESTAMPTZ
)

-- Connected devices
devices (
  id UUID PRIMARY KEY,
  device_name TEXT,
  device_type TEXT,
  created_at TIMESTAMPTZ
)
```

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Tech Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- TypeScript
- Tailwind CSS (iOS-style design system)
- Supabase (Postgres + Realtime)
- TanStack React Query
- Dexie.js (IndexedDB)
- tweetnacl (Encryption)
- Lucide React (Icons - do NOT use custom SVG imports)

## Important Patterns

### Icons
Always use `lucide-react` for icons. Never import SVG files directly as React components.

```tsx
// Correct
import { Shield, Lock, Cloud } from "lucide-react";

// Wrong - causes build issues
import ShieldIcon from "@/components/icons/shield.svg";
```

### Encryption-First Uploads
When uploading photos, always encrypt before storing:

```tsx
const { encrypted, nonce } = await encryptFile(file, secretKey);
await savePhoto({ cid, nonce, encryptedBlob: encrypted, ... });
await uploadCIDMetadata(cid, file.size, deviceId); // Cloud sync
```

### Device Identity
Each browser/device gets a unique ID via `getDeviceId()` from `src/lib/deviceId.ts`. This is used to distinguish which device uploaded which photo.

## UI Style

iOS-inspired design with:
- SF Pro Display font family
- iOS color palette (#007AFF blue, #30D158 green, #FF3B30 red)
- 428px max-width container (iPhone 14 Pro)
- Bottom navigation with 3 tabs
