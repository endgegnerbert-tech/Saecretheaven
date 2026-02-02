# Contributing to SaecretHeaven

👋 Welcome! I am  thrilled you're here.

SaecretHeaven is an **Open Source Privacy Project**. We believe that **trust requires transparency**. You cannot trust a "secure vault" if you cannot see the walls. By keeping our codebase open, we invite the world to verify our Zero-Knowledge architecture.

## Why Contribute?

- **Protect Privacy**: Your code helps build a safe haven for free speech and sensitive data.
- **Learn Crypto**: Work with real-world implementation of AES-GCM, ECDH, and Zero-Knowledge proofs.
- **Premium UX**: We don't just build secure apps; we build *beautiful* ones. Help us polish the "Apple-level" aesthetic.

## 🚀 Getting Started

1.  **Fork the repo** and clone it to your local machine.
2.  **Install dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Environment Setup**:
    Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials.
    *(Note: For local development, you can mock the IPFS/Supabase connections if you're just working on UI)*

4.  **Run the development server**:
    ```bash
    npm run dev
    ```

## 🛠 Areas We Need Help With

- **Security Audits**: Review `src/lib/crypto-asymmetric.ts`. Try to break our encryption. Please report vulnerabilities privately first!
- **UI/UX Polish**: We obsess over details. Smooth animations, perfect colors (no yellow!), and responsive layouts.
- **Chameleon Themes**: Add new "Disguise Themes" for the Burner Links (e.g., a fake Calculator, a fake News site).

## 📝 Code Style

- **Strict TypeScript**: No `any`.
- **Zero-Knowledge First**: Never send private keys to the server. Verification > Trust.
- **Premium Aesthetic**: We use Tailwind CSS. Stick to the design system (iOS Blue `#007AFF`, Deep Blue `#2563EB`). Avoid standard semantic colors like generic "red" or "yellow" unless strictly necessary.

##  Pull Request Process

1.  Create a feature branch: `git checkout -b feature/amazing-feature`
2.  Commit your changes: `git commit -m 'Add some amazing feature'`
3.  Push to the branch: `git push origin feature/amazing-feature`
4.  Open a Pull Request!

## ⚠️ Security Notice

If you find a security vulnerability, please do **NOT** open a public issue.
Email us at einar@black-knight.dev so we can patch it before disclosure.

Thank you for helping us build the future of privacy!
