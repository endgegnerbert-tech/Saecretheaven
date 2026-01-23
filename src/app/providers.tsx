/**
 * Providers - React Query Provider + Service Worker Registration
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000, // 1 minute
                        refetchOnWindowFocus: false,
                    },
                },
            })
    );

    // Register Service Worker for PWA
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            // Register on load
            window.addEventListener('load', () => {
                navigator.serviceWorker
                    .register('/sw.js')
                    .then((registration) => {
                        console.log('[PWA] Service Worker registered:', registration.scope);

                        // Check for updates
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
                            if (newWorker) {
                                newWorker.addEventListener('statechange', () => {
                                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                        console.log('[PWA] New content available, refresh to update');
                                    }
                                });
                            }
                        });
                    })
                    .catch((error) => {
                        console.error('[PWA] Service Worker registration failed:', error);
                    });
            });
        }
    }, []);

    return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
}
