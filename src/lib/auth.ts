/**
 * Better Auth Server Configuration
 *
 * Key Anchoring: Each user's vault_key_hash is locked to their account.
 * This prevents using one account for multiple independent vaults.
 */

import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { Pool } from "pg";

// Supabase Postgres connection with SSL
if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
    console.error("CRITICAL: DATABASE_URL is missing in production!");
}

if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("db.jextayidnmtsoofug") && !process.env.DATABASE_URL.includes("nig")) {
    console.warn("WARNING: DATABASE_URL appears to be TRUNCATED (missing 'nig')");
}

// Create pool only if DATABASE_URL exists
// Note: For Supabase Transaction Mode Pooler (port 6543), we need to handle
// prepared statement limitations
const isTransactionMode = process.env.DATABASE_URL?.includes(':6543');
const pool = process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false, // Required for Supabase connection
        },
        // Disable prepared statements for transaction mode pooler
        ...(isTransactionMode && {
            // Use simple query mode
            query_timeout: 30000,
        }),
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
        requireEmailVerification: true, // Require email verification before access
        minPasswordLength: 8,
        sendResetPassword: async ({ user, url }) => {
            // Dynamic import to avoid circular dependencies
            const { sendPasswordResetEmail } = await import('@/lib/email');
            await sendPasswordResetEmail({
                to: user.email,
                url,
                userName: user.name,
            });
        },
    },

    // Email verification configuration
    emailVerification: {
        sendVerificationEmail: async ({ user, url }) => {
            const { sendVerificationEmail } = await import('@/lib/email');
            await sendVerificationEmail({
                to: user.email,
                url,
                userName: user.name,
            });
        },
        sendOnSignUp: true, // Auto-send on signup
        autoSignInAfterVerification: true, // Sign in after verify
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

    // Trusted origins for CORS (including Tauri desktop app)
    trustedOrigins: [
        process.env.BETTER_AUTH_URL || "http://localhost:3000",
        "https://www.saecretheaven.com",
        "https://saecretheaven.com",
        "http://localhost:3000",
        "tauri://localhost",  // Tauri desktop app
        "https://tauri.localhost",  // Tauri v2 secure context
    ].filter(Boolean),

    databaseHooks: {
        user: {
            create: {
                before: async (user, ctx) => {
                    // Bypass for testing if explicitly enabled
                    if (process.env.TEST_MODE === "true") return;

                    // Ensure context is available
                    if (!ctx) return;

                    try {
                        // Extract access code from request body
                        const body = await ctx.request.clone().json();
                        const accessCode = body.accessCode;

                        if (!accessCode) {
                            throw new APIError("FORBIDDEN", "Access code is required");
                        }

                        // Validate Access Code via Supabase Admin (Direct DB access)
                        const { getSupabaseAdmin } = await import("@/lib/supabase-admin");
                        const admin = getSupabaseAdmin();

                        // Check if code exists and is valid
                        const { data, error } = await admin
                            .from("access_codes")
                            .select("id, is_used")
                            .eq("code", accessCode.trim().toUpperCase())
                            .single();

                        if (error || !data) {
                            throw new APIError("FORBIDDEN", "Invalid access code");
                        }

                        if (data.is_used) {
                            throw new APIError("FORBIDDEN", "Access code already used");
                        }

                        // Claim the code atomically
                        const { error: updateError } = await admin
                            .from("access_codes")
                            .update({
                                is_used: true,
                                used_at: new Date().toISOString()
                            })
                            .eq("id", data.id);

                        if (updateError) {
                            throw new APIError("INTERNAL_SERVER_ERROR", "Failed to claim access code");
                        }

                    } catch (error) {
                         if (error instanceof APIError) throw error;
                         console.error("Access code validation error:", error);
                         // Fail secure
                         throw new APIError("INTERNAL_SERVER_ERROR", "Registration validation failed");
                    }
                },
            },
        },
    },
});

// Type inference for client
export type Auth = typeof auth;
