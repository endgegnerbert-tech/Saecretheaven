/**
 * API Route: Supabase Proxy
 *
 * Proxies Supabase requests to avoid CORS issues on Safari/iOS.
 * Supports device registration, photo metadata operations.
 * 
 * SECURITY: All operations require authenticated session.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Server-side Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest) {
    try {
        // SECURITY: Verify user is authenticated
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized - authentication required" },
                { status: 401 }
            );
        }

        const userId = session.user.id;

        const body = await request.json();
        const { action, ...params } = body;

        // Helper to verify userKeyHash ownership
        const verifyUserKeyHash = async (hash: string) => {
             if (!hash) return false;
             // Check if this user has any device registered with this key hash
             const { data } = await supabase
                .from("devices")
                .select("id")
                .eq("user_id", userId)
                .eq("user_key_hash", hash)
                .limit(1);

             return data && data.length > 0;
        };

        switch (action) {
            case "registerDevice": {
                const { id, deviceName, deviceType, userKeyHash } = params;
                // SECURITY: params.userId is ignored/overwritten by session.user.id

                if (!userKeyHash || userKeyHash.length === 0) {
                    return NextResponse.json(
                        { error: "userKeyHash is required" },
                        { status: 400 }
                    );
                }

                // Check if device exists
                const { data: existingDevice } = await supabase
                    .from("devices")
                    .select("id")
                    .eq("user_id", userId)
                    .eq("device_name", deviceName)
                    .eq("device_type", deviceType || "")
                    .single();

                if (existingDevice) {
                    // Update existing device
                    const { error: updateError } = await supabase
                        .from("devices")
                        .update({
                            device_name: deviceName,
                            device_type: deviceType,
                            user_key_hash: userKeyHash,
                        })
                        .eq("id", existingDevice.id);

                    if (updateError) {
                        console.error("[Supabase Proxy] Device Update Error:", updateError);
                        return NextResponse.json(
                            { error: updateError.message, code: updateError.code },
                            { status: 500 }
                        );
                    }
                    return NextResponse.json({ success: true, updated: true });
                }

                // Insert new device
                const { error } = await supabase.from("devices").insert({
                    id,
                    device_name: deviceName,
                    device_type: deviceType,
                    user_key_hash: userKeyHash,
                    user_id: userId,
                });

                if (error) {
                    console.error("[Supabase Proxy] Device Insert Error:", error);
                    return NextResponse.json(
                        { error: error.message, code: error.code },
                        { status: 500 }
                    );
                }
                return NextResponse.json({ success: true, inserted: true });
            }

            case "uploadMetadata": {
                const { cid, fileSize, deviceId, nonce, mimeType, userKeyHash } = params;

                // SECURITY: Verify user owns the key hash
                if (!await verifyUserKeyHash(userKeyHash)) {
                    return NextResponse.json({ error: "Unauthorized: Invalid userKeyHash" }, { status: 403 });
                }

                const { data, error } = await supabase
                    .from("photos_metadata")
                    .insert([
                        {
                            cid,
                            file_size_bytes: fileSize,
                            device_id: deviceId,
                            nonce,
                            mime_type: mimeType,
                            user_key_hash: userKeyHash,
                        },
                    ])
                    .select();

                if (error) {
                    console.error("[Supabase Proxy] Metadata Upload Error:", error);
                    return NextResponse.json(
                        { error: error.message, code: error.code },
                        { status: 500 }
                    );
                }
                return NextResponse.json({ success: true, data });
            }

            case "loadCIDs": {
                const { userKeyHash } = params;

                if (!userKeyHash) {
                    return NextResponse.json(
                        { error: "userKeyHash is required" },
                        { status: 400 }
                    );
                }

                // SECURITY: Verify user owns the key hash
                if (!await verifyUserKeyHash(userKeyHash)) {
                    return NextResponse.json({ error: "Unauthorized: Invalid userKeyHash" }, { status: 403 });
                }

                // Debug: Also select user_key_hash to verify it matches
                const { data, error } = await supabase
                    .from("photos_metadata")
                    .select("cid, device_id, uploaded_at, file_size_bytes, nonce, mime_type, user_key_hash")
                    .eq("user_key_hash", userKeyHash)
                    .order("uploaded_at", { ascending: false });

                if (error) {
                    console.error("[Supabase Proxy] Load CIDs Error:", error);
                    return NextResponse.json(
                        { error: error.message, code: error.code },
                        { status: 500 }
                    );
                }

                return NextResponse.json({ success: true, data: data || [] });
            }

            case "debugListHashes": {
                // SECURITY: Only list hashes/photos belonging to the authenticated user
                const { data: devices, error: devError } = await supabase
                    .from("devices")
                    .select("user_key_hash")
                    .eq("user_id", userId);

                if (devError) {
                    return NextResponse.json({ error: devError.message }, { status: 500 });
                }

                const myHashes = devices?.map(d => d.user_key_hash) || [];

                if (myHashes.length === 0) {
                     return NextResponse.json({ success: true, hashes: [], photos: [] });
                }

                const { data, error } = await supabase
                    .from("photos_metadata")
                    .select("cid, user_key_hash, uploaded_at")
                    .in("user_key_hash", myHashes)
                    .order("uploaded_at", { ascending: false })
                    .limit(20);

                if (error) {
                    return NextResponse.json({ error: error.message }, { status: 500 });
                }

                // Get unique hashes
                const hashes = Array.from(new Set(data?.map(d => d.user_key_hash) || []));
                console.log("[Supabase Proxy] DEBUG - User hashes:", hashes);

                return NextResponse.json({
                    success: true,
                    hashes,
                    photos: data?.map(d => ({
                        cid: d.cid,
                        hash: d.user_key_hash,
                        date: d.uploaded_at
                    }))
                });
            }

            case "deleteMetadata": {
                const { cid } = params;

                // SECURITY: Verify ownership before delete
                // 1. Get the hash associated with this CID
                const { data: meta, error: fetchError } = await supabase
                    .from("photos_metadata")
                    .select("user_key_hash")
                    .eq("cid", cid)
                    .single();

                if (fetchError || !meta) {
                    return NextResponse.json({ success: true });
                }

                // 2. Verify user owns this hash
                if (!await verifyUserKeyHash(meta.user_key_hash)) {
                    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
                }

                const { error } = await supabase
                    .from("photos_metadata")
                    .delete()
                    .eq("cid", cid);

                if (error) {
                    console.error("[Supabase Proxy] Delete Error:", error);
                    return NextResponse.json(
                        { error: error.message, code: error.code },
                        { status: 500 }
                    );
                }
                return NextResponse.json({ success: true });
            }

            default:
                return NextResponse.json(
                    { error: `Unknown action: ${action}` },
                    { status: 400 }
                );
        }
    } catch (err) {
        console.error("[Supabase Proxy] Error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
