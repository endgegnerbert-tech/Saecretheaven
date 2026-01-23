/**
 * Better Auth Client Configuration
 *
 * React hooks for authentication in client components.
 */

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

// Export commonly used hooks and methods
export const {
    signIn,
    signUp,
    signOut,
    useSession,
    getSession,
} = authClient;

// Type exports for convenience
export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.Session.user;
