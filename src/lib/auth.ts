/**
 * Better Auth Server Configuration
 *
 * Key Anchoring: Each user's vault_key_hash is locked to their account.
 * This prevents using one account for multiple independent vaults.
 */

import { betterAuth } from "better-auth";
import { Pool } from "pg";

// Supabase Postgres connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export const auth = betterAuth({
    database: pool,

    // Email/Password authentication
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false, // For MVP, can enable later
        minPasswordLength: 8,
    },

    // Session configuration
    session: {
        expiresIn: 60 * 60 * 24 * 30, // 30 days
        updateAge: 60 * 60 * 24, // Update session every 24 hours
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5, // 5 minutes cache
        },
    },

    // User configuration with vault_key_hash for key anchoring
    user: {
        additionalFields: {
            vault_key_hash: {
                type: "string",
                required: false,
                defaultValue: null,
                input: false, // Cannot be set by client directly
            },
        },
    },

    // Advanced security settings
    advanced: {
        useSecureCookies: process.env.NODE_ENV === "production",
        generateId: () => crypto.randomUUID(),
    },

    // Rate limiting
    rateLimit: {
        enabled: true,
        window: 60, // 1 minute window
        max: 10, // 10 requests per window
    },

    // Trusted origins for CORS
    trustedOrigins: [
        process.env.BETTER_AUTH_URL || "http://localhost:3000",
    ],
});

// Type inference for client
export type Auth = typeof auth;
