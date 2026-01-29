"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Server Action to verify an access code (read-only check).
 * Note: This is just for UI feedback. The real validation happens in claimAccessCode.
 */
export async function verifyAccessCode(code: string) {
    if (!code || code.trim().length === 0) {
        return { success: false, message: "Code is required" };
    }

    try {
        const { data, error } = await supabaseAdmin
            .from("access_codes")
            .select("id, is_used")
            .eq("code", code.trim().toUpperCase())
            .single();

        if (error || !data) {
            return { success: false, message: "Invalid access code" };
        }

        if (data.is_used) {
            return { success: false, message: "This code has already been used" };
        }

        return { success: true };
    } catch (error) {
        console.error("Verification error:", error);
        return { success: false, message: "Failed to verify code" };
    }
}

/**
 * Server Action to atomically claim an access code.
 * This marks the code as used BEFORE registration to prevent race conditions.
 * Returns the code ID for potential rollback.
 */
export async function claimAccessCode(code: string) {
    if (!code || code.trim().length === 0) {
        return { success: false, message: "Code is required" };
    }

    const normalizedCode = code.trim().toUpperCase();

    try {
        // Atomic update: only succeeds if code exists AND is_used = false
        const { data, error } = await supabaseAdmin
            .from("access_codes")
            .update({
                is_used: true,
                used_at: new Date().toISOString()
            })
            .eq("code", normalizedCode)
            .eq("is_used", false)  // Only claim if not already used!
            .select("id")
            .single();

        if (error || !data) {
            // Either code doesn't exist or already used
            return { success: false, message: "Invalid or already used access code" };
        }

        return { success: true, codeId: data.id };
    } catch (error) {
        console.error("Claim error:", error);
        return { success: false, message: "Failed to claim code" };
    }
}

/**
 * Server Action to release a claimed access code (rollback on registration failure).
 */
export async function releaseAccessCode(codeId: string) {
    if (!codeId) return { success: false };

    try {
        const { error } = await supabaseAdmin
            .from("access_codes")
            .update({
                is_used: false,
                used_at: null
            })
            .eq("id", codeId);

        if (error) {
            console.error("Failed to release code:", error);
            return { success: false };
        }

        return { success: true };
    } catch (error) {
        console.error("Release error:", error);
        return { success: false };
    }
}

/**
 * @deprecated Use claimAccessCode instead for atomic operation
 */
export async function consumeAccessCode(code: string) {
    return claimAccessCode(code);
}
