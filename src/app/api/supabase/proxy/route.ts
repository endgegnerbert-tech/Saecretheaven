/**
 * API Route: Supabase Proxy
 *
 * Proxies Supabase requests to avoid CORS issues on Safari/iOS.
 * Supports device registration, photo metadata operations.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Server-side Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, ...params } = body;

        switch (action) {
            case "registerDevice": {
                const { id, deviceName, deviceType, userKeyHash, userId } = params;

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

                const { data, error } = await supabase
                    .from("photos_metadata")
                    .select("cid, device_id, uploaded_at, file_size_bytes, nonce, mime_type")
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

            case "deleteMetadata": {
                const { cid } = params;

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
