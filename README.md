# SaecretHeaven

<div align="center">

![SaecretHeaven Banner](./public/marketing-assets/banner.png)

### Zero-Knowledge Encrypted Photo Vault for Journalists and Activists

[![License: BSL 1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/SaecretHeaven/privacyheaven)](https://github.com/SaecretHeaven/privacyheaven/releases)
[![Build Status](https://img.shields.io/github/actions/workflow/status/SaecretHeaven/privacyheaven/release.yml)](https://github.com/SaecretHeaven/privacyheaven/actions)
[![Twitter Follow](https://img.shields.io/twitter/follow/SaecretHeaven?style=social)](https://twitter.com/SaecretHeaven)

[Website](https://saecretheaven.com) · [Download](https://github.com/SaecretHeaven/privacyheaven/releases) · [Documentation](https://github.com/SaecretHeaven/privacyheaven/wiki)

</div>

---

## Building the Ultimate Shield

SaecretHeaven is an **encrypted photo backup application** designed for high-risk environments. Built on zero-knowledge encryption principles, it ensures that your sensitive photos are protected from device seizure, forensic analysis, and unauthorized access.

**Core Principle:** Your encryption keys never leave your device. We cannot decrypt your photos, even under legal compulsion.

## Trust Through Verification

This repository contains the **complete client-side implementation** of SaecretHeaven. Every line of encryption, storage, and security code is open for audit. We believe that security tools used by journalists, activists, and human rights defenders must be verifiable.

- **Client-Side Encryption:** Photos are encrypted on your device before any upload using XSalsa20-Poly1305 (TweetNaCl)
- **Zero-Knowledge Architecture:** Server stores only encrypted blobs and metadata, never decryption keys
- **Offline-First:** Full functionality without internet connection via IndexedDB
- **Decentralized Storage:** Encrypted photos stored on IPFS for censorship resistance and redundancy

## Security Architecture

### Current Implementation (Live Protocol)

**Military-Grade Encryption**
- Algorithm: XSalsa20-Poly1305 (TweetNaCl.js)
- Key Management: WebCrypto API (client-side only)
- Local Storage: IndexedDB (encrypted at rest)
- Key Derivation: 12-word BIP39 recovery phrases
- Key Anchoring: SHA-256 hash links user accounts to vaults

**Zero-Trace Capture** (In Development)
- Photos stream directly from camera to RAM via WebRTC getUserMedia
- No disk writes - bypasses forensic recovery tools like Cellebrite
- Immediate encryption with journalist's public key
- Page reload flushes all memory traces
- Designed for anonymous source uploads

**Metadata Removal** (In Development)
- Strip EXIF data (GPS, device serial, timestamps) to protect sources
- Preserve cryptographic proof of authenticity via C2PA signatures
- Dual output: clean public image + detached authenticity manifest
- Integration with contentcredentials.org for verification

**Panic Button** (In Development)
- Emergency key wipe protocol for device seizure scenarios
- Trigger mechanisms: shake detection (DeviceMotion API), triple-tap UI, lockdown notification
- Instant destruction: overwrite encryption keys, wipe IndexedDB, clear localStorage/sessionStorage
- Force page reload to flush RAM
- Makes vault mathematically unrecoverable

### Future Research

- **Traffic Analysis Protection:** Fixed-size chunking to prevent metadata leakage
- **Post-Quantum Cryptography:** Dilithium signatures (experimental)
- **Decoy Vaults:** Duress passwords that unlock fake galleries for plausible deniability

## Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router), React 19
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS, Framer Motion animations
- **UI Components:** Radix UI primitives, custom iOS-inspired design

### Authentication & Database
- **Auth:** Better Auth (email/password + verification)
- **Database:** Supabase (PostgreSQL + Realtime)
- **RLS:** Row-level security policies for user data isolation

### Encryption & Storage
- **Crypto Library:** TweetNaCl + TweetNaCl-util (constant-time NaCl implementation)
- **Local Storage:** Dexie.js (IndexedDB wrapper)
- **Cloud Storage:** IPFS via Pinata (encrypted blobs only)
- **Gateway Racing:** Parallel downloads from multiple IPFS gateways (Pinata, Cloudflare, dweb.link)

### Native Platforms
- **Desktop:** Tauri 2 (Rust-based, OS keychain integration)
- **PWA:** Serwist service worker (offline support, background sync)
- **Mobile:** Progressive Web App (iOS/Android installable)

### State Management
- **Async State:** TanStack React Query
- **Settings:** Zustand (persisted to localStorage)
- **Forms:** React Hook Form + Zod validation

## Features

### Live Features
- End-to-end encrypted photo vault with 12-word recovery phrases
- Multi-device sync via encrypted metadata (not photos) on Supabase
- Offline-first architecture with IndexedDB caching
- HEIC to JPEG conversion for iOS compatibility
- Device fingerprinting and management
- Tauri desktop app with native keychain storage
- Real-time photo sync across devices via Supabase Realtime

### In Development
- Zero-Trace Capture (RAM-only photo processing)
- Metadata Removal with C2PA authenticity proofs
- Panic Button (emergency key wipe)
- Decoy Accounts (duress passwords for plausible deniability)

### Planned
- Post-quantum cryptographic signatures
- Traffic analysis protection via padding
- Mobile native apps (React Native)
- Hardware security module integration

## Installation

### Web App (Recommended)
Visit [saecretheaven.com/app](https://saecretheaven.com/app) and install as a PWA for offline access.

### Desktop App
Download the latest release for your platform:
- macOS: `.dmg` or `.app`
- Windows: `.exe` or `.msi`
- Linux: `.deb` or `.AppImage`

### Build from Source

```bash
# Clone repository
git clone https://github.com/SaecretHeaven/privacyheaven.git
cd privacyheaven

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase and Pinata credentials

# Run development server
npm run dev

# Build desktop app
npm run tauri:build
```

### Environment Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Better Auth
DATABASE_URL=postgresql://...
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# IPFS/Pinata (optional - falls back to mock CIDs)
NEXT_PUBLIC_PINATA_JWT=eyJ...
NEXT_PUBLIC_PINATA_GATEWAY=your-gateway.mypinata.cloud
NEXT_PUBLIC_PINATA_GATEWAY_TOKEN=...
```

## Security Model

### Threat Model
SaecretHeaven is designed to protect against:
- Device seizure by law enforcement (via Panic Button)
- Forensic analysis of deleted photos (via Zero-Trace Capture)
- Source identification via EXIF metadata (via Metadata Removal)
- Coerced unlocking (via Decoy Accounts)
- Server compromise (zero-knowledge encryption)
- Man-in-the-middle attacks (client-side encryption)

### NOT Protected Against
- Keyloggers or malware on the device
- Physical torture or extreme coercion
- Compromised operating system or browser
- Side-channel attacks on the device hardware

### Audit the Crypto
All encryption code is in `src/lib/crypto.ts`. We use:
- TweetNaCl.js: Audited port of Daniel J. Bernstein's NaCl library
- XSalsa20-Poly1305: Authenticated encryption (prevents tampering)
- Constant-time operations: Immune to cache-timing attacks

### Key Management
- Keys generated client-side using WebCrypto API
- 12-word BIP39 recovery phrases (industry standard)
- Keys stored in:
  - **Browser:** localStorage (encrypted at rest by OS)
  - **Desktop:** OS keychain (macOS Keychain, Windows Credential Manager)
- Keys anchored to user accounts via SHA-256 hash (prevents multi-vault abuse)

## Development

### Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Landing page
│   ├── app/               # Main vault application
│   ├── features/          # Feature specification pages
│   └── api/               # API routes
├── components/
│   ├── photovault/        # Core app components
│   ├── features/          # Shared feature components
│   ├── landing/           # Landing page components
│   └── ui/                # Reusable UI primitives
├── lib/
│   ├── crypto.ts          # Encryption utilities
│   ├── auth.ts            # Better Auth config
│   ├── supabase.ts        # Supabase client
│   ├── ipfs.ts            # IPFS/Pinata integration
│   └── storage/           # IndexedDB, settings, native keychain
└── hooks/                 # React hooks for state management
```

### Testing
```bash
# Run E2E tests (requires dev server on port 3001)
npm run dev -- -p 3001
npx playwright test

# Interactive UI mode
npx playwright test --ui

# View test report
npx playwright show-report
```

### Architecture Philosophy
- **Encryption-First:** All photos encrypted before any network operation
- **Offline-First:** Full functionality without internet via IndexedDB
- **Privacy by Design:** Metadata-only sync, encrypted blobs on IPFS
- **Progressive Enhancement:** PWA capabilities, native app optional
- **Zero Trust:** Server never sees unencrypted data or keys

## Open Source Philosophy

### Business Source License 1.1
This project uses BSL 1.1 to balance openness with sustainability:

**What you CAN do:**
- Audit the code for security vulnerabilities
- Use for personal, non-commercial purposes
- Modify and self-host for internal use
- Study the implementation for educational purposes

**What you CANNOT do:**
- Offer SaecretHeaven as a commercial service
- Resell or sublicense the software
- Create a competing hosted product

**Future:** Converts to GPLv3 on January 1, 2030

### Why BSL 1.1?
We need sustainable funding to:
- Conduct professional security audits
- Maintain IPFS infrastructure
- Provide reliable service for high-risk users
- Fund ongoing development of advanced features

The code remains fully auditable while preventing commercial exploitation.

## Contributing

We welcome security audits, bug reports, and feature suggestions:

1. **Security Issues:** Email einar@black-knight.dev (PGP key on website)
2. **Bug Reports:** Open a GitHub issue with reproduction steps
3. **Feature Requests:** Start a discussion in GitHub Discussions
4. **Code Contributions:** Fork, create feature branch, submit PR

Before contributing code, please read:
- Security guidelines: Never commit keys or credentials
- Code style: TypeScript strict mode, Prettier formatting
- Testing: E2E tests required for user-facing features

## Roadmap

### Q1 2026
- Panic Button implementation
- Metadata Removal with EXIF stripping
- Zero-Trace Capture (RAM-only workflow)

### Q2 2026
- C2PA signature integration for authenticity proofs
- Decoy Accounts (duress passwords)
- Mobile native apps (React Native)

### Q3 2026
- Post-quantum cryptography research
- Traffic analysis protection (padding)
- Hardware security module support

### Q4 2026
- Professional security audit
- 1.0 stable release
- Multi-language support

## Support

- **Documentation:** [GitHub Wiki](https://github.com/SaecretHeaven/privacyheaven/wiki)
- **Community:** [GitHub Discussions](https://github.com/SaecretHeaven/privacyheaven/discussions)
- **Email:** einar@black-knight.dev
- **Security:** einar@black-knight.dev (encrypted)

## License

Business Source License 1.1 (BSL 1.1)
- Additional Use Grant: Personal and internal business use
- Change Date: January 1, 2030
- Change License: GPLv3

See [LICENSE](LICENSE) for full terms.

---

<div align="center">

**Built for those who need it most.**

Journalists • Activists • Human Rights Defenders

[Launch App](https://saecretheaven.com/app) • [Read the Manifesto](https://saecretheaven.com/manifesto)

</div>
