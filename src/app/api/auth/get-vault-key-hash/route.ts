/**
 * API Route: Get User's Vault Key Hash
 *
 * Returns the vault_key_hash for the authenticated user.
 * Used to verify local encryption key matches the account.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

export async function GET() {
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

        // Fetch vault_key_hash directly from database
        const result = await pool.query(
            'SELECT vault_key_hash FROM "user" WHERE id = $1',
            [session.user.id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            vaultKeyHash: result.rows[0].vault_key_hash || null,
        });
    } catch (error) {
        console.error("Failed to get vault key hash:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
