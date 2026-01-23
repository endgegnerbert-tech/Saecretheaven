import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
    title: "PhotoVault",
    description: "Sichere deine Fotos mit Zero-Knowledge Verschluesselung",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "PhotoVault",
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
            { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
            { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
        ],
        apple: [
            { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
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
            </head>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
