
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Auto-delete uploads older than 24 hours
const AUTO_DELETE_HOURS = 24;

export async function GET() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // Get user ID
        const { data: userData, error: userError } = await supabase
            .from("users") // Assuming 'users' table or similar holds the mapping, or we just trust auth session ID if using RLS. But here we use Service Role so we need to be careful.
            // Actually, better to query by the user's ID from session if we have it?
            // session.user.id is usually available.
            .select("id")
            .eq("email", session.user.email)
            .single();

        // Fallback if we can't get ID easily, but usually session has it.
        // Let's assume session.user.id is correct or we use the email lookup.

        let userId = session.user.id;
        if (!userId && userData) {
            userId = userData.id;
        }

        if (!userId) {
            // Try to find user by email in auth.users? Service role can but 'users' table is standard in this codebase?
            // Let's rely on filter by email if we can join?
            // Wait, burner_links has user_id.
            return NextResponse.json({ error: "User ID not found" }, { status: 400 });
        }

        // Query stealth_uploads via burner_links
        // We want all uploads where the burner_link belongs to the user
        // Since Supabase join syntax with nested tables is:
        // select('*, burner_links!inner(*)')

        // 1. Get all burner link IDs for this user
        const { data: links, error: linksError } = await supabase
            .from("burner_links")
            .select("id, slug, theme, public_key, creator_user_id") // Adjusted selection
            .eq("creator_user_id", userId);

        if (linksError) throw linksError;

        if (!links || links.length === 0) {
            return NextResponse.json({ uploads: [] });
        }

        const linkIds = links.map(l => l.id);
        const linksMap = new Map(links.map(l => [l.id, l]));

        // 2. Get uploads for these links
        const { data: uploads, error: uploadsError } = await supabase
            .from("stealth_uploads")
            .select("id, cid, mime_type, file_size_bytes, uploaded_at, salt, ephemeral_public_key, iv, burner_link_id")
            .in("burner_link_id", linkIds)

            .order("uploaded_at", { ascending: false });

        if (uploadsError) throw uploadsError;

        // 3. Attach burner_links data manually to match structure expected by frontend
        const enrichedUploads = uploads.map(u => ({
            ...u,
            burner_links: linksMap.get(u.burner_link_id)
        }));

        return NextResponse.json({ uploads: enrichedUploads });
    } catch (error) {
        console.error("Error fetching uploads:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * DELETE /api/burner/uploads?id=<upload_id>
 *
 * Permanently deletes a stealth upload:
 * 1. Verifies ownership via burner_link -> user
 * 2. Deletes from stealth_uploads table
 * 3. Optionally unpins from IPFS (TODO)
 */
export async function DELETE(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uploadId = request.nextUrl.searchParams.get("id");
    if (!uploadId) {
        return NextResponse.json({ error: "Missing upload ID" }, { status: 400 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // 1. Get the upload and verify ownership
        const { data: upload, error: uploadError } = await supabase
            .from("stealth_uploads")
            .select("id, cid, burner_link_id")
            .eq("id", uploadId)
            .single();

        if (uploadError || !upload) {
            return NextResponse.json({ error: "Upload not found" }, { status: 404 });
        }

        // 2. Verify the user owns the burner link
        const { data: link, error: linkError } = await supabase
            .from("burner_links")
            .select("creator_user_id")
            .eq("id", upload.burner_link_id)
            .single();

        if (linkError || !link) {
            return NextResponse.json({ error: "Burner link not found" }, { status: 404 });
        }

        if (link.creator_user_id !== session.user.id) {
            return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        // 3. Delete the upload
        const { error: deleteError } = await supabase
            .from("stealth_uploads")
            .delete()
            .eq("id", uploadId);

        if (deleteError) throw deleteError;

        // 4. TODO: Unpin from IPFS via Pinata API
        // const pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT;
        // if (pinataJwt && upload.cid && !upload.cid.startsWith('cid_')) {
        //     try {
        //         await fetch(`https://api.pinata.cloud/pinning/unpin/${upload.cid}`, {
        //             method: 'DELETE',
        //             headers: { 'Authorization': `Bearer ${pinataJwt}` }
        //         });
        //     } catch (e) { console.warn('IPFS unpin failed:', e); }
        // }

        return NextResponse.json({ success: true, deletedId: uploadId });
    } catch (error) {
        console.error("Error deleting upload:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * Cleanup expired uploads (called by cron or manually)
 * POST /api/burner/uploads?action=cleanup
 */
export async function POST(request: NextRequest) {
    const action = request.nextUrl.searchParams.get("action");

    if (action !== "cleanup") {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Optional: Add a secret key check for cron jobs
    const cronSecret = request.headers.get("x-cron-secret");
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && cronSecret !== expectedSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // Calculate cutoff time (24 hours ago)
        const cutoffTime = new Date(Date.now() - AUTO_DELETE_HOURS * 60 * 60 * 1000).toISOString();

        // Get expired uploads
        const { data: expiredUploads, error: fetchError } = await supabase
            .from("stealth_uploads")
            .select("id, cid")
            .lt("uploaded_at", cutoffTime);

        if (fetchError) throw fetchError;

        if (!expiredUploads || expiredUploads.length === 0) {
            return NextResponse.json({ message: "No expired uploads", deleted: 0 });
        }

        // Delete expired uploads
        const expiredIds = expiredUploads.map(u => u.id);
        const { error: deleteError } = await supabase
            .from("stealth_uploads")
            .delete()
            .in("id", expiredIds);

        if (deleteError) throw deleteError;

        console.log(`[Cleanup] Deleted ${expiredIds.length} expired stealth uploads`);

        return NextResponse.json({
            message: "Cleanup complete",
            deleted: expiredIds.length,
            ids: expiredIds
        });
    } catch (error) {
        console.error("Error during cleanup:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
