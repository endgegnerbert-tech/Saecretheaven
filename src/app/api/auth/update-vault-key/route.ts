/**
 * API Route: Update User's Vault Key Hash
 *
 * This endpoint anchors the user's encryption key hash to their account.
 * Once set, the vault_key_hash cannot be changed (prevents using one account for multiple vaults).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Pool } from "pg";

// Use the same database connection as Better Auth
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

export async function POST(request: NextRequest) {
    try {
        // Verify the user is authenticated
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { userId, keyHash } = await request.json();

        // Verify the request is for the authenticated user
        if (session.user.id !== userId) {
            return NextResponse.json(
                { error: "Forbidden - cannot update another user's vault" },
                { status: 403 }
            );
        }

        // Check if user already has a vault_key_hash (key anchoring)
        const currentUser = session.user as { vault_key_hash?: string };
        if (currentUser.vault_key_hash) {
            return NextResponse.json(
                { error: "Vault key already anchored to this account" },
                { status: 400 }
            );
        }

        // Validate keyHash format (should be 16-character hex string)
        if (!keyHash || typeof keyHash !== "string" || !/^[a-f0-9]{16}$/.test(keyHash)) {
            return NextResponse.json(
                { error: "Invalid key hash format" },
                { status: 400 }
            );
        }

        // Update the user's vault_key_hash directly in the database
        const result = await pool.query(
            'UPDATE "user" SET vault_key_hash = $1, updated_at = NOW() WHERE id = $2 AND vault_key_hash IS NULL',
            [keyHash, userId]
        );

        if (result.rowCount === 0) {
            // Either user doesn't exist or already has a vault_key_hash
            return NextResponse.json(
                { error: "Failed to update vault key - may already be set" },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to update vault key hash:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
