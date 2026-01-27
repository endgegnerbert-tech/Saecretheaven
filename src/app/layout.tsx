import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
    title: {
        default: "SaecretHeaven – Zero-Knowledge Encrypted Photo Vault",
        template: "%s | SaecretHeaven",
    },
    description: "Store your photos with military-grade encryption. Zero-knowledge architecture means only YOU can see your memories. End-to-end encrypted, decentralized IPFS storage, EU servers.",
    keywords: [
        "photo vault",
        "encrypted photos",
        "zero-knowledge encryption",
        "privacy photo storage",
        "secure photo backup",
        "end-to-end encryption",
        "IPFS storage",
        "private photos",
        "encrypted gallery",
        "photo security",
    ],
    authors: [{ name: "Einar Jäger" }],
    creator: "Einar Jäger",
    publisher: "SaecretHeaven",
    manifest: "/manifest.json",
    
    // Open Graph (Facebook, LinkedIn, etc.)
    openGraph: {
        type: "website",
        locale: "de_DE",
        alternateLocale: "en_US",
        url: "https://saecretheaven.com",
        siteName: "SaecretHeaven",
        title: "SaecretHeaven – Zero-Knowledge Encrypted Photo Vault",
        description: "Store your photos with military-grade encryption. Zero-knowledge architecture means only YOU can see your memories.",
        images: [
            {
                url: "/og-image.png",
                width: 1200,
                height: 630,
                alt: "SaecretHeaven - Your photos, encrypted",
            },
        ],
    },
    
    // Twitter Card
    twitter: {
        card: "summary_large_image",
        title: "SaecretHeaven – Zero-Knowledge Encrypted Photo Vault",
        description: "Store your photos with military-grade encryption. Only YOU can see your memories.",
        images: ["/og-image.png"],
        creator: "@blacknightdev",
    },
    
    // Robots
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
    
    // Verification (add your IDs when available)
    // verification: {
    //     google: "your-google-verification-id",
    // },
    
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "SaecretHeaven",
        startupImage: [
            {
                url: "/splash/apple-splash-2048-2732.png",
                media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
            },
            {
                url: "/splash/apple-splash-1170-2532.png",
                media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
            },
            {
                url: "/splash/apple-splash-1284-2778.png",
                media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
            },
        ],
    },
    icons: {
        icon: [
            { url: "/logo.svg", type: "image/svg+xml" },
        ],
        apple: [
            { url: "/logo.svg", type: "image/svg+xml" },
        ],
    },
    other: {
        "mobile-web-app-capable": "yes",
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
    themeColor: "#007AFF",
};

import { Analytics } from "@vercel/analytics/react";
import { JsonLd } from "@/components/seo/JsonLd";
import SkipToContent from "@/components/a11y/SkipToContent";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="de" suppressHydrationWarning>
            <head>
                <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <JsonLd />
            </head>
            <body>
                <SkipToContent />
                <Providers>{children}</Providers>
                <Analytics />
            </body>
        </html>
    );
}
