/**
 * API Route: IPFS Download Proxy
 *
 * Proxies IPFS downloads to avoid CORS issues on mobile browsers.
 * This allows the client to fetch encrypted photos through our own API.
 *
 * Features:
 * - Streaming response for large files (no memory buffering)
 * - Timeout handling (30s default, prevents hanging requests)
 * - Multiple gateway fallback with fast failover
 * - Immutable caching (IPFS content is content-addressed)
 */

import { NextRequest, NextResponse } from "next/server";

const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud';
const PINATA_GATEWAY_TOKEN = process.env.NEXT_PUBLIC_PINATA_GATEWAY_TOKEN || '';

// Timeout for each gateway attempt (30 seconds)
const GATEWAY_TIMEOUT_MS = 30000;

function getGatewayBase(): string {
    if (PINATA_GATEWAY.startsWith('http')) return PINATA_GATEWAY;
    if (PINATA_GATEWAY.includes('.')) return `https://${PINATA_GATEWAY}`;
    return `https://${PINATA_GATEWAY}.mypinata.cloud`;
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            headers: { 'Accept': '*/*' },
            signal: controller.signal,
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function GET(request: NextRequest) {
    const cid = request.nextUrl.searchParams.get('cid');

    if (!cid) {
        return NextResponse.json(
            { error: "CID parameter required" },
            { status: 400 }
        );
    }

    // Validate CID format (CIDv0 and CIDv1)
    const isValidCID = (
        (cid.startsWith('Qm') && cid.length === 46) ||
        cid.startsWith('bafy') ||
        cid.startsWith('bafk') ||
        cid.startsWith('bafb')
    );

    if (!isValidCID) {
        return NextResponse.json(
            { error: "Invalid CID format" },
            { status: 400 }
        );
    }

    // Build gateway URLs (ordered by reliability for our content)
    // Priority: Contabo (self-hosted) -> Pinata -> Public gateways
    const gatewayBase = getGatewayBase();
    const selfHostedGateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL || 'https://ipfs.saecretheaven.com';

    const gateways = [
        // Gateway 1: Self-hosted Contabo (for new content)
        () => `${selfHostedGateway}/ipfs/${cid}`,
        // Gateway 2: Pinata (for old content + fallback)
        () => {
            const url = new URL(`${gatewayBase}/ipfs/${cid}`);
            if (PINATA_GATEWAY_TOKEN) url.searchParams.set('pinataGatewayToken', PINATA_GATEWAY_TOKEN);
            return url.toString();
        },
        // Gateway 3-5: Public fallbacks
        () => `https://cloudflare-ipfs.com/ipfs/${cid}`,
        () => `https://dweb.link/ipfs/${cid}`,
        () => `https://ipfs.io/ipfs/${cid}`,
    ];

    let lastError: Error | null = null;

    for (const getUrl of gateways) {
        const url = getUrl();
        console.log(`[IPFS Proxy] Trying: ${url.substring(0, 80)}...`);

        try {
            const response = await fetchWithTimeout(url, GATEWAY_TIMEOUT_MS);

            if (response.ok && response.body) {
                const contentLength = response.headers.get('content-length');
                console.log(`[IPFS Proxy] Success, streaming ${contentLength || 'unknown'} bytes`);

                // Stream the response directly without buffering
                return new Response(response.body, {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        ...(contentLength && { 'Content-Length': contentLength }),
                        'Cache-Control': 'public, max-age=31536000, immutable',
                        'X-Content-Type-Options': 'nosniff',
                    },
                });
            }

            console.warn(`[IPFS Proxy] Gateway failed: ${response.status}`);
            lastError = new Error(`Gateway returned ${response.status}`);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                console.warn(`[IPFS Proxy] Gateway timeout: ${url.substring(0, 50)}...`);
                lastError = new Error('Gateway timeout');
            } else {
                console.error(`[IPFS Proxy] Gateway error:`, err);
                lastError = err as Error;
            }
        }
    }

    console.error(`[IPFS Proxy] All gateways failed for CID: ${cid}`);
    return NextResponse.json(
        { error: "Failed to download from IPFS", details: lastError?.message },
        { status: 502 }
    );
}
