/**
 * API Route: IPFS Download Proxy
 *
 * Proxies IPFS downloads to avoid CORS issues on mobile browsers.
 * This allows the client to fetch encrypted photos through our own API.
 */

import { NextRequest, NextResponse } from "next/server";

const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud';
const PINATA_GATEWAY_TOKEN = process.env.NEXT_PUBLIC_PINATA_GATEWAY_TOKEN || '';

function getGatewayBase(): string {
    if (PINATA_GATEWAY.startsWith('http')) return PINATA_GATEWAY;
    if (PINATA_GATEWAY.includes('.')) return `https://${PINATA_GATEWAY}`;
    return `https://${PINATA_GATEWAY}.mypinata.cloud`;
}

export async function GET(request: NextRequest) {
    const cid = request.nextUrl.searchParams.get('cid');

    if (!cid) {
        return NextResponse.json(
            { error: "CID parameter required" },
            { status: 400 }
        );
    }

    // Validate CID format
    const isValidCID = (
        (cid.startsWith('Qm') && cid.length === 46) ||
        cid.startsWith('bafy') ||
        cid.startsWith('bafk')
    );

    if (!isValidCID) {
        return NextResponse.json(
            { error: "Invalid CID format" },
            { status: 400 }
        );
    }

    // Build gateway URLs
    const gatewayBase = getGatewayBase();
    const gateways = [
        () => {
            const url = new URL(`${gatewayBase}/ipfs/${cid}`);
            if (PINATA_GATEWAY_TOKEN) url.searchParams.set('pinataGatewayToken', PINATA_GATEWAY_TOKEN);
            return url.toString();
        },
        () => `https://cloudflare-ipfs.com/ipfs/${cid}`,
        () => `https://dweb.link/ipfs/${cid}`,
    ];

    let lastError: Error | null = null;

    for (const getUrl of gateways) {
        const url = getUrl();
        console.log(`[IPFS Proxy] Trying: ${url.substring(0, 60)}...`);

        try {
            const response = await fetch(url, {
                headers: {
                    'Accept': '*/*',
                },
            });

            if (response.ok) {
                const blob = await response.blob();
                console.log(`[IPFS Proxy] Success, size: ${blob.size} bytes`);

                return new NextResponse(blob, {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Content-Length': blob.size.toString(),
                        'Cache-Control': 'public, max-age=31536000, immutable',
                    },
                });
            }

            console.warn(`[IPFS Proxy] Gateway failed: ${response.status}`);
            lastError = new Error(`Gateway returned ${response.status}`);
        } catch (err) {
            console.error(`[IPFS Proxy] Gateway error:`, err);
            lastError = err as Error;
        }
    }

    console.error(`[IPFS Proxy] All gateways failed for CID: ${cid}`);
    return NextResponse.json(
        { error: "Failed to download from IPFS", details: lastError?.message },
        { status: 502 }
    );
}
