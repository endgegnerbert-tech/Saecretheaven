# AGENTS.md - Photovault Development Guide

This document provides guidelines for agentic coding tools working on the Photovault codebase.

## Tech Stack

- **Framework**: Next.js 16.1.4
- **Language**: TypeScript 5.x
- **UI**: Radix UI, Tailwind CSS, shadcn/ui components
- **Database**: Dexie (IndexedDB), Supabase (planned)
- **Encryption**: tweetnacl (client-side encryption)
- **State Management**: React Query, React Hook Form, Zustand
- **Testing**: Playwright for E2E testing
- **Authentication**: Better Auth framework

## Build/Lint/Test Commands

### Development

```bash
npm run dev  # Starts Next.js development server
```

### Build

```bash
npm run build  # Creates production build
npm run start  # Starts production server
```

### Testing

- **Playwright**: Used for E2E testing

```bash
npx playwright test  # Run all tests
npx playwright test path/to/test.spec.ts  # Run specific test file
npx playwright test --ui  # Run tests with UI
npx playwright test --project=chromium  # Run tests on specific browser
npx playwright test --debug  # Run tests in debug mode
```

### Type Checking

```bash
npx tsc --noEmit  # Run TypeScript type checking
```

### Formatting

```bash
npx prettier --write .  # Format all files
npx prettier --check .  # Check formatting
```

### Linting

```bash
# No specific linting tool configured, use TypeScript and Prettier
```

## Code Style Guidelines

### Imports

- Use absolute imports with `@/*` alias (configured in tsconfig.json)
- Group imports: external libraries, local utilities, components, types
- Avoid wildcard imports (`import * as`) unless necessary
- Import React hooks and components from their specific paths

```typescript
// Good
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useEncryption } from "@/hooks/use-encryption";

// Avoid
import * as React from "react";
import * as utils from "@/lib/utils";
```

### Formatting

- Use Prettier for consistent formatting (configured in package.json)
- 2-space indentation
- Single quotes for strings
- Trailing commas in multi-line objects/arrays
- No semicolons (except where required)
- Maximum line length: 100 characters (soft limit)

### TypeScript

- Strict mode enabled in tsconfig.json
- Explicit return types for all public functions
- Use interfaces for object shapes and props
- Prefer `type` for unions, intersections, and complex types
- Avoid `any` - use `unknown` with type guards
- Use TypeScript generics for reusable components and hooks

```typescript
// Good
interface User {
  id: string;
  name: string;
  email?: string;
  createdAt: Date;
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

function getUser(id: string): Promise<User | null> {
  // ...
}

// Avoid
function getUser(id) {
  // No type annotation
  // ...
}

const user: any = getUser(); // Avoid any
```

### Naming Conventions

- **Components**: PascalCase (e.g., `PhotoGallery.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useEncryption.ts`)
- **Utilities**: camelCase (e.g., `cn()` in utils.ts)
- **Types/Interfaces**: PascalCase (e.g., `EncryptionKey`, `PhotoMetadata`)
- **Constants**: UPPER_CASE (e.g., `STORAGE_KEY`, `MAX_FILE_SIZE`)
- **Test files**: `*.spec.ts` for Playwright tests (e.g., `user-flow.spec.ts`)
- **Private variables/functions**: Prefix with `_` (e.g., `_internalHelper`)

### Error Handling

- Use try/catch for all async operations
- Provide meaningful, user-friendly error messages
- Handle edge cases with null/undefined checks
- Use optional chaining (`?.`) and nullish coalescing (`??`) where appropriate
- Never expose sensitive information in error messages
- Log errors with context for debugging

```typescript
// Good
try {
  const result = await someOperation();
  if (!result) {
    throw new Error("Operation returned empty result");
  }
  return result;
} catch (error) {
  console.error("Operation failed:", error);
  // Provide user-friendly message
  throw new Error("Failed to complete operation. Please try again.");
}

// Avoid
try {
  return await someOperation();
} catch {
  // Silent error - bad practice
}
```

### Component Structure

- Use shadcn/ui patterns for consistent components
- Extract complex logic to custom hooks
- Use TypeScript interfaces for all component props
- Follow Radix UI accessibility patterns
- Keep components small and focused (Single Responsibility Principle)
- Use React.forwardRef for components that need ref forwarding

```typescript
// Good component structure
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost";
  size?: "sm" | "default" | "lg" | "icon";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    const { className, variant = "default", size = "default", isLoading, ...rest } = props;

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={isLoading}
        {...rest}
      >
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {children}
      </button>
    );
  }
);
```

### Encryption Patterns

Photovault implements end-to-end encryption with these key principles:

- **Client-side only**: All encryption/decryption happens in the browser
- **Zero-knowledge**: Server never sees unencrypted data
- **Key management**: Users control their encryption keys

```typescript
// Good encryption pattern
const { encrypted, nonce } = await encryptFile(file, secretKey);
// Store encrypted blob and nonce separately in IndexedDB

// Always clear sensitive data from memory
function clearSensitiveData() {
  secretKey.fill(0);
  Array.from({ length: 100 }).forEach(() => new Uint8Array(1024));
}

// Avoid
console.log("Secret key:", secretKey); // Never log keys
console.log("Recovery phrase:", recoveryPhrase); // Never log recovery data
```

### State Management

- **Server state**: Use React Query for data fetching and caching
- **Client state**: Use Zustand for global state, React context for localized state
- **Component state**: Use React's useState/useReducer for local state
- **Avoid prop drilling**: Use context providers or Zustand for deeply nested state
- **Optimize re-renders**: Use memoization (React.memo, useMemo, useCallback) where appropriate

```typescript
// Good Zustand store pattern
interface GalleryState {
  photos: PhotoMetadata[];
  selectedPhotoIds: Set<number>;
  isLoading: boolean;
  addPhoto: (photo: PhotoMetadata) => void;
  toggleSelect: (id: number) => void;
  clearSelection: () => void;
}

export const useGalleryStore = create<GalleryState>((set) => ({
  photos: [],
  selectedPhotoIds: new Set(),
  isLoading: false,
  addPhoto: (photo) => set((state) => ({ photos: [...state.photos, photo] })),
  toggleSelect: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedPhotoIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return { selectedPhotoIds: newSet };
    }),
  clearSelection: () => set({ selectedPhotoIds: new Set() }),
}));
```

### File Organization

```
src/
├── app/                  # Next.js pages and routing
├── components/           # React components
│   ├── ui/               # shadcn/ui components
│   ├── features/         # Feature-specific components
│   └── icons/            # Icon components
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and core logic
│   ├── crypto.ts         # Encryption utilities
│   ├── storage/         # Storage implementations
│   ├── utils.ts          # General utilities
│   └── constants.ts      # Application constants
├── types/               # TypeScript type definitions
└── styles/              # Global styles and CSS
```

### Documentation

- Add JSDoc comments for all public functions, components, and hooks
- Document encryption flows and security considerations
- Document complex algorithms and data flows
- Keep README.md updated with setup and deployment instructions
- Document API endpoints and their expected behavior

```typescript
/**
 * Generates a new encryption key pair using tweetnacl
 *
 * @returns EncryptionKey object containing publicKey and secretKey
 * @throws Will throw if crypto operations fail
 *
 * @example
 * const { publicKey, secretKey } = generateKeyPair();
 * await saveKeyToStorage(secretKey);
 */
export function generateKeyPair(): EncryptionKey {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey,
  };
}
```

### Security Considerations

- **Never commit secrets**: API keys, encryption keys, or sensitive configuration
- **Encrypt all user data**: Before storage in IndexedDB or any backend
- **Use environment variables**: For all sensitive configuration
- **Validate all inputs**: Both user inputs and API responses
- **Implement proper error handling**: Without exposing sensitive information
- **Sanitize all outputs**: Especially when displaying user-generated content
- **Use CSP headers**: To prevent XSS attacks
- **Implement rate limiting**: For all public API endpoints

```typescript
// Good security practice
const API_KEY = process.env.NEXT_PUBLIC_API_KEY; // From environment
if (!API_KEY) {
  throw new Error("API key not configured");
}

// Validate and sanitize user input
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9\-\_\.]/g, "_");
}
```

### Testing Guidelines

- **Test coverage**: Focus on critical paths (encryption, authentication, data persistence)
- **Test types**: Unit tests for utilities, integration tests for hooks, E2E tests for user flows
- **Test data**: Use realistic test data that matches production scenarios
- **Edge cases**: Test with empty data, invalid inputs, network errors
- **Performance**: Test with large datasets to identify performance bottlenecks
- **Accessibility**: Test components with screen readers and keyboard navigation

```typescript
// Good test structure
test.describe("Encryption Utilities", () => {
  test("generateKeyPair creates valid keys", () => {
    const { publicKey, secretKey } = generateKeyPair();
    expect(publicKey).toBeInstanceOf(Uint8Array);
    expect(secretKey).toBeInstanceOf(Uint8Array);
    expect(publicKey.length).toBe(nacl.box.publicKeyLength);
  });

  test("encrypt and decrypt work correctly", async () => {
    const keyPair = generateKeyPair();
    const testData = new TextEncoder().encode("Hello World");

    const encrypted = encrypt(testData, keyPair.secretKey);
    expect(encrypted.ciphertext).toBeTruthy();
    expect(encrypted.nonce).toBeTruthy();

    const decrypted = decrypt(encrypted, keyPair.secretKey);
    expect(decrypted).toEqual(testData);
  });
});
```

## Project-Specific Patterns

### Client-Side Encryption Flow

Photovault implements a comprehensive end-to-end encryption system:

1. **Key Generation**: `generateKeyPair()` creates a new key pair using tweetnacl
2. **Key Storage**: `saveKeyToStorage()` stores the secret key encrypted in localStorage
3. **Data Encryption**: `encryptFile()` encrypts files before storage
4. **Data Storage**: Store encrypted blobs with associated nonce in IndexedDB
5. **Data Decryption**: `decryptFile()` decrypts files when needed
6. **Key Recovery**: `keyToRecoveryPhrase()` and `recoveryPhraseToKey()` for backup/restore

### IndexedDB Storage with Dexie

- Use Dexie for all IndexedDB operations
- Store only encrypted data (never plaintext)
- Implement proper error handling and retries for storage operations
- Use transactions for atomic operations
- Handle quota exceeded errors gracefully

```typescript
// Good Dexie pattern
const db = new Dexie("PhotoVaultDB") as Dexie & {
  photos: Dexie.Table<EncryptedPhoto, number>;
};

db.version(1).stores({
  photos: "++id,encryptedBlob,nonce,metadata",
});

// Always handle errors
try {
  const photoId = await db.photos.add({
    encryptedBlob,
    nonce,
    metadata: encryptedMetadata,
  });
} catch (error) {
  console.error("Failed to save photo:", error);
  throw new Error("Failed to save photo. Please check storage space.");
}
```

### Authentication with Better Auth

Photovault uses Better Auth for authentication. Follow these patterns:

- Use the auth client for all authentication operations
- Always check session validity before accessing protected data
- Handle authentication errors gracefully
- Implement proper session management

```typescript
// Good authentication pattern
import { auth } from "@/lib/auth";

const session = await auth.getSession();
if (!session) {
  redirect("/login");
}

// Access user data from session
const userId = session.user.id;
```

### Testing Strategy

- **Playwright**: Primary tool for E2E testing
- **Test coverage**: Focus on user flows, encryption/decryption, and data persistence
- **Test scenarios**: Include happy paths, error cases, and edge cases
- **Performance testing**: Test with large numbers of photos
- **Cross-browser testing**: Test on Chromium, Firefox, and WebKit

```bash
# Run specific test
npx playwright test tests/user-flow.spec.ts

# Run with trace
npx playwright test --trace on

# Show test report
npx playwright show-report
```

## Common Pitfalls and Solutions

1. **Encryption Key Management**

   - **Problem**: Losing encryption keys means losing all data
   - **Solution**: Implement robust key backup and recovery systems

2. **Type Safety**

   - **Problem**: Type errors can cause runtime issues
   - **Solution**: Always run `npx tsc --noEmit` before committing

3. **Error Handling**

   - **Problem**: Silent errors make debugging difficult
   - **Solution**: Always log errors with context and provide user feedback

4. **Performance**

   - **Problem**: Large file encryption can be slow in browser
   - **Solution**: Implement chunked encryption and progress indicators

5. **Storage Limits**

   - **Problem**: IndexedDB has size limitations
   - **Solution**: Implement storage quota monitoring and cleanup

6. **Memory Management**
   - **Problem**: Large Uint8Array buffers can cause memory issues
   - **Solution**: Clear sensitive data and use weak references where appropriate

## Best Practices for This Codebase

1. **Understand the encryption flow** before modifying storage logic
2. **Follow existing patterns** for components, hooks, and utilities
3. **Test encryption/decryption** thoroughly with various file types and sizes
4. **Use TypeScript** for all new code with strict typing
5. **Keep components** small, focused, and composable
6. **Document security decisions** clearly with rationale
7. **Optimize for mobile** - Photovault targets iOS/Android web
8. **Handle offline scenarios** gracefully with proper error messages
9. **Implement proper cleanup** for resources (blobs, object URLs, etc.)
10. **Follow semantic versioning** for all changes

## Working with Encryption

When working with the encryption system:

1. **Never log sensitive data** (keys, recovery phrases, plaintext data)
2. **Always validate inputs** before encryption operations
3. **Handle encryption failures** gracefully with user feedback
4. **Clear sensitive data from memory** when no longer needed
5. **Test with various file types** (images, videos, documents)
6. **Consider performance implications** of large file encryption

This comprehensive guide should help maintain consistency, security, and quality throughout the Photovault codebase while working with agentic coding tools.
