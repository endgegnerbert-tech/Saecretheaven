# PhotoVault

**Secure your photos with Zero-Knowledge Encryption**

PhotoVault is a privacy-focused photo storage app that encrypts your photos client-side before they leave your device. With PhotoVault, only YOU can access your photos - not even the server can see them.

## Features

✅ **End-to-End Encryption** - All photos encrypted before upload
✅ **Zero-Knowledge** - Server never sees unencrypted data
✅ **Client-Side Only** - Encryption happens in your browser
✅ **Offline Access** - View your photos without internet
✅ **Cross-Platform** - Works on iOS, Android, and Desktop
✅ **PWA Support** - Install as a native app

## Installation

### Web App (Recommended)

1. Visit [https://photovault.app](https://photovault.app) (coming soon)
2. Click "Add to Home Screen" on mobile or "Install" on desktop
3. Enjoy your private photo vault!

### Desktop Installation Guide

#### Windows 11/10

**Method 1: Edge Browser (Recommended)**

1. Open PhotoVault in Microsoft Edge
2. Click the three-dot menu (⋯) in the top-right corner
3. Select "Apps" > "Install this site as an app"
4. Confirm installation
5. PhotoVault will open in its own window and appear in your Start menu

**Method 2: Chrome Browser**

1. Open PhotoVault in Google Chrome
2. Click the three-dot menu (⋮) in the top-right corner
3. Select "More tools" > "Create shortcut..."
4. Check "Open as window" and click "Create"
5. A PhotoVault shortcut will appear on your desktop

**Method 3: Manual Installation**

1. Download the latest release from GitHub
2. Extract the ZIP file
3. Run `PhotoVault.exe` (Windows) or `PhotoVault` (Mac)
4. The app will launch in its own window

#### macOS

**Method 1: Safari (Recommended)**

1. Open PhotoVault in Safari
2. Click "File" > "Add to Dock"
3. PhotoVault will appear in your Dock as a separate app

**Method 2: Chrome Browser**

1. Open PhotoVault in Google Chrome
2. Click the three-dot menu (⋮) in the top-right corner
3. Select "More tools" > "Create shortcut..."
4. Check "Open as window" and click "Create"
5. A PhotoVault shortcut will appear on your desktop

**Method 3: Manual Installation**

1. Download the latest `.dmg` file from GitHub
2. Open the DMG and drag PhotoVault to your Applications folder
3. Launch from Applications or Spotlight

#### Linux

**Method 1: Chrome/Chromium Browser**

1. Open PhotoVault in Chrome/Chromium
2. Click the three-dot menu (⋮) in the top-right corner
3. Select "More tools" > "Create shortcut..."
4. Check "Open as window" and click "Create"
5. A PhotoVault shortcut will appear on your desktop

**Method 2: Manual Installation**

1. Download the latest `.AppImage` or `.deb` file from GitHub
2. Make it executable: `chmod +x PhotoVault-*.AppImage`
3. Run it: `./PhotoVault-*.AppImage`
4. For system integration, install the `.deb` package

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/photovault.git
cd photovault

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production

```bash
# Create production build
npm run build

# Start production server
npm run start
```

### PWA Features

PhotoVault includes comprehensive PWA support:

- **Offline Mode**: View your photos without internet connection
- **Installable**: Add to home screen on mobile and desktop
- **Background Sync**: Uploads resume when you're back online
- **Push Notifications**: Get notified about backup status (coming soon)
- **Periodic Sync**: Automatic background sync (coming soon)

### Desktop App Features

When installed as a desktop app, PhotoVault provides:

- **Native Window**: Runs in its own window, separate from browser
- **System Integration**: Appears in taskbar/dock and app switcher
- **File Associations**: Open image files directly with PhotoVault
- **Protocol Handler**: Custom `photovault://` links
- **Auto Updates**: Automatic updates in the background

## Security

### Encryption

PhotoVault uses **tweetnacl.js** for client-side encryption:

- **Secret Key**: 256-bit encryption key generated on your device
- **Public Key**: Used for key exchange (future multi-device sync)
- **Recovery Phrase**: 12-word phrase to backup your encryption key
- **File Encryption**: Each file encrypted with unique nonce

### Key Management

Your encryption key is stored securely:

1. **In Memory**: Key is kept in memory while app is running
2. **Encrypted Storage**: Key is encrypted before saving to localStorage
3. **Recovery Phrase**: 12-word phrase for backup/restore
4. **Zero Knowledge**: Server never sees your encryption key

### Data Storage

- **IndexedDB**: Encrypted photos stored in browser database
- **LocalStorage**: Encrypted encryption key
- **Cloud Backup**: Encrypted data only (IPFS, Supabase, etc.)

## Architecture

```
src/
├── app/                  # Next.js pages and routing
├── components/           # React components
│   ├── ui/               # UI components (shadcn)
│   ├── features/         # Feature-specific components
│   └── icons/            # Icon components
├── hooks/               # Custom React hooks
├── lib/                 # Core logic and utilities
│   ├── crypto.ts         # Encryption utilities
│   ├── storage/         # Storage implementations
│   ├── utils.ts          # General utilities
│   └── constants.ts      # App constants
├── types/               # TypeScript types
└── styles/              # Global styles
```

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

### Code Style

- **TypeScript**: Strict typing everywhere
- **ESLint**: Follows standard rules
- **Prettier**: Automatic code formatting
- **Commit Messages**: Follow conventional commits

### Testing

```bash
# Run all tests
npx playwright test

# Run specific test
npx playwright test tests/user-flow.spec.ts

# Run with UI
npx playwright test --ui
```

## Support

- **Documentation**: [https://docs.photovault.app](https://docs.photovault.app) (coming soon)
- **Community**: [https://community.photovault.app](https://community.photovault.app) (coming soon)
- **Email**: support@photovault.app

## License

PhotoVault is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Roadmap

- [x] Core encryption functionality
- [x] Photo upload and gallery
- [x] PWA installation
- [x] Offline support
- [ ] Multi-device sync
- [ ] AI-powered photo organization
- [ ] Advanced sharing features
- [ ] Premium subscription plans

## Credits

- **Encryption**: tweetnacl.js
- **UI Components**: shadcn/ui, Radix UI
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Database**: Dexie.js
- **Framework**: Next.js

## Privacy Policy

Your privacy is our top priority. PhotoVault implements zero-knowledge encryption, meaning:

- We never see your unencrypted photos
- We never store your encryption keys
- We never access your personal data
- All encryption happens on your device

Read our full [Privacy Policy](PRIVACY.md) for details.

---

**PhotoVault** - Your photos, your privacy, your control. 🔒📸
