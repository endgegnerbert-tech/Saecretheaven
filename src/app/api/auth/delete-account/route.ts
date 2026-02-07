import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function DELETE(req: NextRequest) {
    // 1. Verify session
    const session = await auth.api.getSession({
        headers: req.headers
    });

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    // user.vault_key_hash might be in session.user.vault_key_hash if configured in session fields,
    // but typically it's in additionalFields. better-auth session types might not have it unless extended.
    // We'll fetch it from DB to be sure.

    const admin = getSupabaseAdmin();

    try {
        console.log(`[Panic] Deleting account for user ${userId}`);

        // Fetch user to get vault_key_hash
        const { data: user, error: fetchError } = await admin
            .from("user")
            .select("vault_key_hash")
            .eq("id", userId)
            .single();

        if (fetchError) {
             console.error("Error fetching user for deletion:", fetchError);
             // Proceed anyway to delete what we can by ID
        }

        const vaultKeyHash = user?.vault_key_hash;

        // 2. Delete user data

        // Stealth Uploads (linked to burner links)
        // We delete burner links, if cascade is not set, we might need to delete uploads first.
        // Let's try to delete burner links and hope for cascade, or delete manually.
        // To be safe, let's delete burner links by user_id.
        // If we need to delete stealth uploads, we need to find burner links first.

        const { data: burnerLinks } = await admin
            .from("burner_links")
            .select("id")
            .eq("creator_user_id", userId);

        if (burnerLinks && burnerLinks.length > 0) {
            const linkIds = burnerLinks.map(l => l.id);
            await admin.from("stealth_uploads").delete().in("burner_link_id", linkIds);
            await admin.from("burner_links").delete().in("id", linkIds);
        }

        // Photos Metadata (linked by vault_key_hash)
        if (vaultKeyHash) {
            const { error: photosError } = await admin
                .from("photos_metadata")
                .delete()
                .eq("user_key_hash", vaultKeyHash);
            if (photosError) console.error("Error deleting photos:", photosError);
        }

        // Devices (linked by user_id)
        const { error: devicesError } = await admin
            .from("devices")
            .delete()
            .eq("user_id", userId);
        if (devicesError) console.error("Error deleting devices:", devicesError);

        // 3. Delete User
        const { error: userError } = await admin
            .from("user")
            .delete()
            .eq("id", userId);

        if (userError) {
            console.error("Error deleting user:", userError);
            return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
        }

        // 4. Return success
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Delete account error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
