# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Info

- **Package name**: `saecret-heaven` (internal, in package.json)
- **Brand name**: **PhotoVault** (user-facing, in UI/marketing)
- **Repository**: privacyheaven

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run analyze  # Bundle analyzer (set ANALYZE=true)
```

### Tauri Desktop App

```bash
npm run tauri:dev    # Start Tauri dev mode (web + native window)
npm run tauri:build  # Build native desktop app (macOS/Windows/Linux)
```

Tauri builds from `./out` directory. Rust code lives in `src-tauri/`.

### Testing (Playwright)

```bash
npx playwright test              # Run all tests
npx playwright test --ui         # Interactive UI mode
npx playwright test user-flow    # Run specific test file
npx playwright show-report       # View HTML report after tests
```

**Important:** Tests expect the dev server at port 3001. Start with `npm run dev -- -p 3001` before running tests.

**Test Configuration** (playwright.config.ts):
- Tests run **sequentially** (workers: 1) for stability - avoid race conditions
- 30-second timeout per test
- Screenshots and videos captured on failure
- Retries: 2 in CI, 0 locally
- Base URL: http://localhost:3001

## Development Tools

- **No dedicated lint script** - Code formatting and linting should be handled via IDE configuration or pre-commit hooks
- **Bundle analysis**: Run `npm run analyze` to analyze bundle size (generates build with webpack bundle analyzer)
- **TypeScript**: Strict mode enabled - all code must be properly typed
- **Prettier**: Available for code formatting (installed but no dedicated script)

## File Structure

```
src/
├── app/                           # Next.js App Router
│   ├── page.tsx                   # Landing page (/)
│   ├── app/                       # PhotoVault app route
│   │   └── page.tsx               # Main app entry (/app)
│   ├── api/                       # API routes
│   │   ├── auth/                  # Better Auth endpoints
│   │   ├── ipfs/                  # IPFS proxy endpoints
│   │   └── supabase/              # Supabase proxy
│   ├── (legal)/                   # Legal pages group
│   │   ├── terms/
│   │   ├── privacy/
│   │   └── impressum/
│   └── layout.tsx                 # Root layout
│
├── components/
│   ├── photovault/                # PhotoVault-specific components
│   │   ├── PhotoVaultApp.tsx     # Main app container (phase management)
│   │   ├── AuthScreen.tsx        # Login/signup
│   │   ├── UnlockVaultScreen.tsx # Enter recovery phrase
│   │   ├── VaultSetupScreen.tsx  # Create new vault
│   │   ├── PhotoGallery.tsx      # Photo grid with upload
│   │   └── SettingsPanel.tsx     # App settings
│   ├── ui/                        # Reusable UI components (Radix-based)
│   └── landing/                   # Landing page components
│
├── hooks/                         # Custom React hooks
│   ├── useEncryption.ts          # Key generation, recovery phrases
│   ├── useGalleryData.ts         # Photo CRUD + sync
│   ├── useRealtimeSync.ts        # Supabase Realtime subscriptions
│   └── useLocalPhotos.ts         # IndexedDB photo operations
│
├── lib/                           # Core business logic
│   ├── auth.ts                    # Better Auth server config
│   ├── auth-client.ts            # Better Auth client hooks
│   ├── crypto.ts                 # Encryption utilities (tweetnacl)
│   ├── supabase.ts               # Supabase client & metadata operations
│   ├── ipfs.ts                   # IPFS/Pinata operations
│   ├── deviceId.ts               # Device fingerprinting
│   ├── heic-converter.ts         # HEIC to JPEG conversion
│   ├── storage/
│   │   ├── local-db.ts           # Dexie.js IndexedDB wrapper
│   │   ├── remote-storage.ts     # IPFS upload/download with gateway racing
│   │   ├── native-keychain.ts    # Tauri keychain integration
│   │   └── settings-store.ts     # Zustand settings store
│   └── utils.ts                  # General utilities
│
├── types/                         # TypeScript type definitions
│   ├── supabase.ts               # Supabase database types
│   └── index.ts                  # Shared types
│
src-tauri/                         # Tauri (Rust) code for desktop app
├── src/
│   ├── main.rs                   # Tauri entry point
│   └── lib.rs                    # Tauri commands
├── Cargo.toml                    # Rust dependencies
└── tauri.conf.json               # Tauri configuration

public/
├── sw.js                         # Service worker (Serwist)
├── manifest.json                 # PWA manifest
└── icons/                        # App icons (various sizes)

tests/                            # Playwright E2E tests
└── user-flow.spec.ts            # Main user flow test
```

### File Naming Conventions
- **React Components**: PascalCase (`PhotoGallery.tsx`)
- **Hooks**: camelCase with `use` prefix (`useEncryption.ts`)
- **Utilities/Libraries**: camelCase (`crypto.ts`, `deviceId.ts`)
- **API Routes**: lowercase folders (`api/auth/[...all]/route.ts`)
- **Types**: PascalCase interfaces/types in camelCase files

## Architecture Overview

PhotoVault is an **encrypted photo backup app** with a mobile-first iOS-style UI. The core principle is **client-side encryption first** - all photos are encrypted locally before any upload.

### Data Flow

```
User Photo → Encrypt (tweetnacl) → Store Local (IndexedDB) → Upload to IPFS → Sync CID to Supabase
```

1. **Authentication** (`src/lib/auth.ts`, `src/lib/auth-client.ts`): Better Auth handles email/password authentication. User accounts are linked to vaults via `vault_key_hash`.

2. **Encryption Layer** (`src/lib/crypto.ts`): Uses tweetnacl for symmetric encryption. Keys stored in localStorage, recoverable via 12-word phrase. Key is anchored to user account via `vault_key_hash`.

3. **Local Storage** (`src/lib/storage/local-db.ts`): Dexie.js wrapper for IndexedDB. Stores encrypted photo blobs + metadata offline-first.

4. **Remote Storage** (`src/lib/ipfs.ts`, `src/lib/storage/remote-storage.ts`): Encrypted blobs are uploaded to **IPFS via Pinata**. Downloads race multiple gateways (Pinata, Cloudflare, dweb.link) for speed.

5. **Metadata Sync** (`src/lib/supabase.ts`): Only CID metadata syncs to Supabase (NOT the actual photos). Enables multi-device photo list sync.

6. **Realtime** (`src/hooks/useRealtimeSync.ts`): Supabase Realtime subscription for live updates when photos are added from other devices.

### Route Structure

**Public Routes:**
- `/` - Marketing landing page (anonymous access)
- `/terms`, `/privacy`, `/impressum` - Legal pages (anonymous access)

**Protected Routes:**
- `/app` - Main PhotoVault application (requires auth + vault unlock)

**API Routes:**
- `/api/auth/[...all]` - Better Auth catch-all handler (login, signup, session management)
- `/api/auth/update-vault-key` - Update user's vault_key_hash (POST, requires auth)
- `/api/auth/get-vault-key-hash` - Get user's vault_key_hash (GET, requires auth)
- `/api/ipfs/upload` - Server-side proxy for Pinata uploads (POST, requires auth)
- `/api/ipfs/download` - Server-side proxy for IPFS downloads (GET, avoids CORS)
- `/api/supabase/proxy` - Supabase proxy for metadata operations (POST, requires auth)

### App Flow (Phases)

The app at `/app` has distinct phases managed in `PhotoVaultApp.tsx`:

1. **auth**: No session → Show login/signup (AuthScreen)
2. **unlock**: Session exists, no local key → Enter recovery phrase (UnlockVaultScreen)
3. **setup**: Session exists, no vault_key_hash → Create new vault (VaultSetupScreen)
4. **main**: Fully authenticated with local key → Main app with gallery/settings

### Key Hooks

- `useEncryption`: Key generation, storage, recovery phrase management
- `useGalleryData`: Photo CRUD with encryption + automatic cloud sync
- `useRealtimeSync`: Cross-device realtime photo sync
- `useSession`: Better Auth session hook from `src/lib/auth-client.ts`

### Main UI Components (src/components/photovault/)

- `PhotoVaultApp.tsx`: Root component, manages app phases and navigation
- `AuthScreen.tsx`: Login/signup with Better Auth
- `UnlockVaultScreen.tsx`: Enter recovery phrase to unlock vault
- `VaultSetupScreen.tsx`: Create new vault with key generation
- `PhotoGallery.tsx`: Photo grid with upload, decrypt-on-demand
- `SettingsPanel.tsx`: Device management, security, plan settings

### State Management

Global app state is lifted to `PhotoVaultApp.tsx` and passed down. TanStack Query handles async data (photos). Zustand persists settings. Better Auth handles session state.

## Database Schema

Supabase stores **metadata only** - actual encrypted photos are on IPFS.

### Supabase Tables (RLS enabled)

```sql
-- Photo metadata (actual content is on IPFS)
photos_metadata (
  id UUID PRIMARY KEY,
  cid TEXT UNIQUE,        -- IPFS Content Identifier
  device_id TEXT,         -- Which device uploaded
  file_size_bytes BIGINT,
  nonce TEXT,             -- Encryption nonce (Base64)
  mime_type TEXT,         -- Original MIME type
  user_key_hash TEXT,     -- Hash of user's encryption key
  uploaded_at TIMESTAMPTZ
)

-- Connected devices
devices (
  id UUID PRIMARY KEY,
  device_name TEXT,
  device_type TEXT,
  user_key_hash TEXT,     -- Links device to encryption key
  user_id TEXT,           -- Better Auth user ID
  created_at TIMESTAMPTZ
)
```

### Better Auth Tables

Better Auth auto-creates tables on first run (no manual migrations needed):
- `user` - User accounts with custom `vault_key_hash` field for key anchoring
- `session` - Active sessions
- `account` - OAuth/email account links
- `verification` - Email verification tokens

**Setup**: Configure `DATABASE_URL` in `.env.local` pointing to Supabase Postgres. Better Auth will automatically create all required tables on first API call.

## Environment Variables

Required in `.env.local`:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Better Auth
DATABASE_URL=postgresql://...  # Supabase Postgres connection string
BETTER_AUTH_URL=http://localhost:3000  # Or production URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# IPFS/Pinata (optional - falls back to mock CIDs if not set)
NEXT_PUBLIC_PINATA_JWT=eyJ...
NEXT_PUBLIC_PINATA_GATEWAY=your-gateway.mypinata.cloud
NEXT_PUBLIC_PINATA_GATEWAY_TOKEN=...
```

## Tech Stack

### Core Framework
- **Next.js 16** (App Router) - Full-stack React framework
- **React 19** - UI library
- **TypeScript** - Type safety throughout

### Authentication & Database
- **Better Auth** (email/password + email verification) - `src/lib/auth.ts`, `src/lib/auth-client.ts`
- **Supabase** (Postgres + Realtime) - Metadata storage only, not photos
- **@supabase/ssr** - Server-side Supabase client
- **@supabase/supabase-js** - Client-side Supabase client

### Encryption & Storage
- **tweetnacl** + **tweetnacl-util** - NaCl crypto library (secretbox encryption)
- **Dexie.js** - IndexedDB wrapper for local encrypted photo storage
- **IPFS/Pinata** - Decentralized storage for encrypted blobs

### UI & Styling
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Headless component primitives (@radix-ui/react-*)
- **Lucide React** - Icon library (**ALWAYS use this, never import SVG files**)
- **Framer Motion** - Animation library
- **class-variance-authority** - Component variant styling
- **next-themes** - Dark/light theme support

### State Management & Data Fetching
- **TanStack React Query** - Async state management (photos, devices)
- **Zustand** - Global state for settings (persisted to localStorage)
- **React Hook Form** - Form state management

### PWA & Native
- **@serwist/next** - Service worker for PWA features
- **Tauri 2** (@tauri-apps/api, @tauri-apps/cli) - Native desktop app builds

### Media & Utilities
- **heic2any** - HEIC to JPEG conversion (iOS photos)
- **qrcode.react** - QR code generation (recovery phrases)
- **embla-carousel-react** - Photo carousel/gallery
- **Zod** - Runtime type validation

## Important Patterns

### Icons
Always use `lucide-react` for icons. Never import SVG files directly as React components.

```tsx
// Correct
import { Shield, Lock, Cloud } from "lucide-react";

// Wrong - causes build issues
import ShieldIcon from "@/components/icons/shield.svg";
```

### Authentication with Better Auth
```tsx
import { useSession, signIn, signUp, signOut } from "@/lib/auth-client";

const { data: session, isPending } = useSession();
if (session?.user) {
  // User is authenticated
}
```

### Key Anchoring (vault_key_hash)
Each user account is linked to exactly one vault via `vault_key_hash`. This prevents using one account for multiple vaults.

```tsx
// When setting up vault or unlocking
const keyHash = await getUserKeyHash(secretKey);
await updateUserVaultKeyHash(userId, keyHash);  // Anchor to account
await registerDevice(deviceId, deviceName, deviceType, keyHash, userId);
```

### Encryption-First Uploads to IPFS
When uploading photos, encrypt locally then upload to IPFS:

```tsx
const { encrypted, nonce } = await encryptFile(file, secretKey);
const cid = await remoteStorage.upload(encrypted);  // → IPFS via Pinata
await uploadCIDMetadata(cid, file.size, deviceId, nonce, mimeType, userKeyHash);  // → Supabase
```

### HEIC Conversion
iOS photos in HEIC format are auto-converted to JPEG via `heic2any` before encryption. See `src/lib/heic-converter.ts`.

### Device Identity
Each browser/device gets a unique ID via `getDeviceId()` from `src/lib/deviceId.ts`. Devices are registered to Supabase with both `user_key_hash` and `user_id`.

### Tauri Native Features
When running as a Tauri desktop app (`src/lib/storage/native-keychain.ts`):
- Encryption keys stored in OS keychain (macOS Keychain, Windows Credential Manager)
- Device ID persists in app data directory (survives browser storage clears)
- Check `isTauri()` to detect desktop environment
- Falls back to localStorage automatically in web mode

### Multi-Device Sync
Photos and devices are grouped by `user_key_hash`. Devices with the same recovery phrase (and thus same key) see each other's photos.

### State Management: Zustand for Settings
```tsx
import { useSettingsStore } from '@/lib/storage/settings-store';
const { backupActive, setBackupActive } = useSettingsStore();
```

## Security Principles

PhotoVault is built on **zero-knowledge encryption**. These principles are CRITICAL and must be maintained:

### Never Trust the Server
- **All encryption happens client-side** before any network request
- Server never sees unencrypted photos or encryption keys
- IPFS stores encrypted blobs only
- Supabase stores metadata only (CIDs, sizes, nonces - NOT photos)

### Encryption Key Protection
```tsx
// CRITICAL: Keys must never leave the client unencrypted
❌ await fetch('/api/save-key', { body: JSON.stringify({ key }) })  // NEVER
✅ localStorage.setItem('vault_key', encryptedKey)                   // OK (encrypted)
✅ await storeInKeychain(key)                                        // OK (OS keychain)
```

### vault_key_hash Usage
The `vault_key_hash` is a **one-way hash** of the encryption key used for:
- Linking user accounts to vaults (preventing multiple vaults per account)
- Grouping devices by encryption key
- **NOT for encryption** - it's just an identifier

```tsx
// Correct usage
const keyHash = await getUserKeyHash(secretKey);  // SHA-256 hash
await updateUserVaultKeyHash(userId, keyHash);    // Store hash only

// Never reverse it
❌ const key = await reverseHash(keyHash);  // IMPOSSIBLE - one-way only
```

### API Route Security
All protected API routes MUST verify authentication:
```tsx
// src/app/api/*/route.ts pattern
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }
  // ... proceed with authenticated operation
}
```

### RLS (Row Level Security)
Supabase tables use RLS policies to ensure users only access their own data:
- `photos_metadata`: Filter by `user_key_hash`
- `devices`: Filter by `user_key_hash` AND `user_id`

When adding new tables, ALWAYS enable RLS and create appropriate policies.

## Offline-First Architecture

PhotoVault works offline by default. Understanding the sync flow is critical:

### Storage Layers (in order of priority)
1. **IndexedDB** (via Dexie.js) - Primary source of truth
2. **IPFS** (via Pinata) - Cloud backup for encrypted blobs
3. **Supabase** - Metadata sync only (CIDs, device info)

### Photo Lifecycle
```
Upload:  User → Encrypt → IndexedDB → IPFS → Supabase (metadata)
         [Instant]      [Instant]    [Async]  [Async]

View:    IndexedDB → Decrypt → Display
         [Instant]   [Instant] [Instant]

Sync:    Other Device → Supabase (metadata) → IPFS → Decrypt → IndexedDB
                        [Realtime]             [Lazy]  [On-demand]
```

### Key Points
- **Photos display instantly** from IndexedDB (no network needed)
- **Uploads continue in background** if you close the app (service worker)
- **Sync is automatic** via Supabase Realtime subscriptions
- **Downloads are lazy** - only fetch from IPFS when viewing on new device
- **Gateway racing** - tries multiple IPFS gateways simultaneously for fastest download

## Common Pitfalls & Debugging

### Issue: Photos not syncing between devices
**Check:**
1. Both devices have the same recovery phrase (thus same `user_key_hash`)
2. Supabase Realtime is connected (check browser console for "SUBSCRIBED")
3. Photos have been uploaded to IPFS (check `photos_metadata` table for CIDs)
4. Device is registered in `devices` table

### Issue: Decryption fails
**Check:**
1. Nonce is correctly stored in `photos_metadata` (Base64 encoded)
2. Encryption key in localStorage matches the key used for encryption
3. HEIC files were converted to JPEG before encryption

### Issue: IPFS upload fails
**Check:**
1. `NEXT_PUBLIC_PINATA_JWT` is set in `.env.local`
2. Pinata API key is valid and has upload permissions
3. File size is within Pinata limits
4. Network connectivity (falls back to mock CIDs if offline)

### Issue: Better Auth session expires
**Check:**
1. `BETTER_AUTH_URL` matches the current domain (http://localhost:3000 in dev)
2. Database connection is working (`DATABASE_URL` is correct)
3. Session cookie is being set (check browser DevTools → Application → Cookies)

### Debugging Commands
```bash
# Check IndexedDB contents
# Open browser DevTools → Application → IndexedDB → photovault-db

# Check Supabase data
# Visit Supabase dashboard → Table Editor → photos_metadata

# Check IPFS upload
# Visit https://gateway.pinata.cloud/ipfs/[CID]

# Check service worker
# Open DevTools → Application → Service Workers

# Check localStorage (encryption key, device ID)
# Open DevTools → Application → Local Storage → http://localhost:3000
```

### Common Development Issues

**Issue: "Module not found" for @tauri-apps/api**
- Tauri is optional - app works in browser without it
- Install with: `npm install @tauri-apps/api`
- Or check `isTauri()` before importing Tauri modules

**Issue: Service worker not updating**
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Unregister in DevTools → Application → Service Workers → Unregister
- Clear site data: DevTools → Application → Clear storage

**Issue: Port 3000 already in use**
- Kill process: `lsof -ti:3000 | xargs kill` (Mac/Linux)
- Or use different port: `npm run dev -- -p 3001`

**Issue: TypeScript errors after updating dependencies**
- Delete `node_modules` and `.next`: `rm -rf node_modules .next`
- Reinstall: `npm install`
- Restart TypeScript server in VSCode: Cmd+Shift+P → "TypeScript: Restart TS Server"

**Issue: IndexedDB quota exceeded**
- Clear IndexedDB: DevTools → Application → IndexedDB → photovault-db → Delete
- Or implement photo cleanup in app settings

## PWA & Service Worker

PhotoVault is a Progressive Web App with full offline support.

### Service Worker (`public/sw.js`)
Powered by **Serwist** (@serwist/next) for advanced caching:
- **Runtime caching** - API responses, IPFS downloads
- **Background sync** - Retry failed uploads when back online
- **Precaching** - Static assets for instant offline access

### PWA Features
- **Installable** - Add to home screen on iOS/Android/Desktop
- **Offline-first** - Full functionality without internet
- **Background sync** - Uploads resume automatically
- **App-like experience** - No browser chrome when installed

### Manifest (`public/manifest.json`)
Defines app metadata, icons, theme colors, and display mode (standalone).

## Deployment Considerations

### Environment Variables
Ensure ALL required env vars are set in production:
```bash
# Critical for production
BETTER_AUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
DATABASE_URL=postgresql://...
NEXT_PUBLIC_PINATA_JWT=...
NEXT_PUBLIC_PINATA_GATEWAY=...
NEXT_PUBLIC_PINATA_GATEWAY_TOKEN=...
```

### Build Process
```bash
npm run build        # Creates optimized production build
npm run start        # Serves the production build
```

### Tauri Desktop Builds
```bash
npm run tauri:build  # Builds native apps for current platform
# Outputs:
# - macOS: .dmg, .app
# - Windows: .exe, .msi
# - Linux: .deb, .AppImage
```

### Database Migrations
Better Auth handles its own migrations automatically. For custom tables:
1. Create tables in Supabase dashboard
2. Enable RLS
3. Add policies for user isolation

### IPFS Gateway Configuration
For production, use a dedicated Pinata gateway:
1. Create dedicated gateway in Pinata dashboard
2. Enable gateway access restrictions
3. Set `NEXT_PUBLIC_PINATA_GATEWAY` to your gateway URL

## UI Style

iOS-inspired design with:
- SF Pro Display font family
- iOS color palette (#007AFF blue, #30D158 green, #FF3B30 red)
- 1200px max-width container
- Bottom navigation with 2 tabs (Gallery, Settings)
- Smooth animations via Framer Motion
- Touch-optimized interactions (swipe, long-press)

---

## Quick Reference

### Most Common Commands
```bash
npm run dev              # Start dev server (port 3000)
npm run dev -- -p 3001   # Dev server on custom port (for testing)
npm run build            # Production build
npm run tauri:dev        # Desktop app dev mode
npx playwright test      # Run E2E tests
```

### Key Files to Know
- `src/components/photovault/PhotoVaultApp.tsx` - App entry point & phase management
- `src/lib/crypto.ts` - Encryption/decryption logic
- `src/lib/storage/local-db.ts` - IndexedDB operations
- `src/lib/storage/remote-storage.ts` - IPFS upload/download
- `src/hooks/useGalleryData.ts` - Main photo management hook
- `src/lib/auth.ts` - Better Auth server config
- `src/lib/auth-client.ts` - Better Auth client hooks

### Critical Patterns to Remember
```tsx
// ✅ Always encrypt before upload
const { encrypted, nonce } = await encryptFile(file, key);
const cid = await uploadToIPFS(encrypted);

// ✅ Always use lucide-react for icons
import { Shield, Lock } from "lucide-react";

// ✅ Always check auth in API routes
const session = await auth.api.getSession({ headers: request.headers });
if (!session?.user) return new Response('Unauthorized', { status: 401 });

// ✅ Always check if Tauri before using native features
if (isTauri()) {
  await storeInKeychain(key);
} else {
  localStorage.setItem('key', key);
}
```

### Data Flow Summary
```
Photo Upload:
User → Encrypt → IndexedDB → IPFS → Supabase metadata

Photo View:
IndexedDB → Decrypt → Display (instant, no network)

Multi-Device Sync:
Device A → Supabase (metadata) → Device B → IPFS → IndexedDB
```

### Environment Variables Checklist
```bash
# Required for production:
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ DATABASE_URL
✅ BETTER_AUTH_URL
✅ NEXT_PUBLIC_APP_URL

# Optional (falls back to mocks):
⚪ NEXT_PUBLIC_PINATA_JWT
⚪ NEXT_PUBLIC_PINATA_GATEWAY
⚪ NEXT_PUBLIC_PINATA_GATEWAY_TOKEN
```
