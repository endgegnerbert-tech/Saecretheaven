# SaecretHeaven

<div align="center">

![SaecretHeaven Banner](./public/marketing-assets/banner.png)

### The Zero-Knowledge Cloud Storage for the Post-Privacy Era.

[![License: BSL 1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/SaecretHeaven/privacyheaven)](https://github.com/SaecretHeaven/privacyheaven/releases)
[![Build Status](https://img.shields.io/github/actions/workflow/status/SaecretHeaven/privacyheaven/release.yml)](https://github.com/SaecretHeaven/privacyheaven/actions)
[![Twitter Follow](https://img.shields.io/twitter/follow/SaecretHeaven?style=social)](https://twitter.com/SaecretHeaven)

[Website](https://saecretheaven.com) · [Download](https://github.com/SaecretHeaven/privacyheaven/releases) · [Waitlist](https://saecretheaven.com/#waitlist)

</div>

---

## 🔒 Trust Through Verification

SaecretHeaven is built on a simple premise: **"Don't Trust. Verify."**

In a world where "Encryption" is a buzzword, we offer **Mathematical Certainty**.
This repository contains the **Open Core** of SaecretHeaven. We believe that critical security infrastructure must be open for audit.

- **Client-Side Encryption:** Your files are encrypted *before* they leave your device using `XSalsa20-Poly1305`.
- **Zero-Knowledge:** We do not have your keys. We cannot see your files. Even if served with a subpoena, we cannot decrypt your data.
- **Decentralized Storage:** Encrypted shards are distributed across the IPFS network, ensuring redundancy and censorship resistance.

## ⚡ Features

- **Quantum-Resistant Architecture:** Built with future-proof cryptography in mind.
- **Multi-Device Sync:** Seamlessly access your vault on macOS, Windows, iOS, and Android.
- **Auto-Backup:** Background synchronization ensures you never lose a memory.
- **PWA First:** Installable directly from the browser for maximum privacy and sandboxing.

## 🛠️ Tech Stack

- **Core:** Next.js 14, React, TypeScript
- **Desktop:** Tauri (Rust-based, audited security)
- **Crypto:** TweetNaCl.js (Audited NaCl port)
- **State:** Zustand + TanStack Query
- **Styling:** TailwindCSS + Framer Motion

## 🏗️ Development & Security Model

### The "Open Core" Philosophy
We operate under a **Source Available (BSL 1.1)** model.
- **Public Core (`main`):** This repository contains the client-side code, encryption logic, and UI. You can audit exactly how your data is handled.
- **Production Environment:** Our hosted production builds run from a secure, private branch that includes signing keys and API secrets.

**Why?**
This ensures that while the code is auditable, the official infrastructure cannot be spoofed or hijacked.

### Build from Source (macOS/Linux)

```bash
# 1. Clone the repo
git clone https://github.com/SaecretHeaven/privacyheaven.git

# 2. Install dependencies
npm install

# 3. Audit the crypto
# Check src/lib/crypto.ts to verify our implementation of XSalsa20.

# 4. Run locally (Requires own API keys)
npm run dev
```

## 📜 License

This software is licensed under the **Business Source License 1.1 (BSL)**.
- **Free for:** Non-production use, auditing, personal modification.
- **Prohibited:** Commercial competition, reselling, or hosting as a service without a license.
- **Conversion:** Becomes Open Source (GPLv3) on Jan 1, 2030.

See [LICENSE](LICENSE) for details.

---

<div align="center">
Built with 🛡️ for the Paranoid.
</div>
