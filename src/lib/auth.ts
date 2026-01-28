/**
 * Better Auth Server Configuration
 *
 * Key Anchoring: Each user's vault_key_hash is locked to their account.
 * This prevents using one account for multiple independent vaults.
 */

import { betterAuth } from "better-auth";
import { Pool } from "pg";

// Supabase Postgres connection with SSL
if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
    console.error("CRITICAL: DATABASE_URL is missing in production!");
}

if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("db.jextayidnmtsoofug") && !process.env.DATABASE_URL.includes("nig")) {
    console.warn("WARNING: DATABASE_URL appears to be TRUNCATED (missing 'nig')");
}

// Create pool only if DATABASE_URL exists
const pool = process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false, // Required for Supabase connection
        },
    })
    : null;

if (!pool) {
    console.error("CRITICAL: Could not create database pool - DATABASE_URL missing");
    throw new Error("DATABASE_URL environment variable is required");
}

export const auth = betterAuth({
    database: pool as Pool,

    // Email/Password authentication
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false, // For MVP, can enable later
        minPasswordLength: 8,
    },

    // User configuration with vault_key_hash for key anchoring
    user: {
        fields: {
            emailVerified: "email_verified",
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
        additionalFields: {
            vault_key_hash: {
                type: "string",
                required: false,
                defaultValue: null,
                input: false, // Cannot be set by client directly
            },
        },
    },

    // Session configuration
    session: {
        expiresIn: 60 * 60 * 24 * 30, // 30 days
        updateAge: 60 * 60 * 24, // Update session every 24 hours
        fields: {
            userId: "user_id",
            expiresAt: "expires_at",
            ipAddress: "ip_address",
            userAgent: "user_agent",
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5, // 5 minutes cache
        },
    },

    // Account configuration
    account: {
        fields: {
            userId: "user_id",
            accountId: "account_id",
            providerId: "provider_id",
            accessToken: "access_token",
            refreshToken: "refresh_token",
            accessTokenExpiresAt: "access_token_expires_at",
            refreshTokenExpiresAt: "refresh_token_expires_at",
            idToken: "id_token",
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    },

    // Verification configuration
    verification: {
        fields: {
            expiresAt: "expires_at",
            createdAt: "created_at",
            updatedAt: "updated_at",
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
        max: 100, // Increased to 100 to handle startup bursts
    },

    // Trusted origins for CORS
    trustedOrigins: [
        process.env.BETTER_AUTH_URL || "http://localhost:3000",
        "https://www.saecretheaven.com",
        "https://saecretheaven.com",
        "http://localhost:3000",
    ].filter(Boolean),
});

// Type inference for client
export type Auth = typeof auth;
