"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings } from "lucide-react";
import { CustomIcon } from "@/components/ui/custom-icon";
import ShieldLoader from "@/components/ui/shield-loader";

// Screens
import { AuthScreen } from "./AuthScreen";
import { UnlockVaultScreen } from "./UnlockVaultScreen";
import { VaultSetupScreen } from "./VaultSetupScreen";
import { Dashboard } from "./Dashboard";
import { SettingsPanel } from "./SettingsPanel";
import { PhotoGallery } from "./PhotoGallery";

// Auth
import { useSession, signOut } from "@/lib/auth-client";

// Crypto
import { loadKeyFromStorage, getUserKeyHash, clearKeyFromStorage } from "@/lib/crypto";

// Device & Supabase
import { getDeviceId, getDeviceName, getDeviceType } from "@/lib/deviceId";
import { registerDevice } from "@/lib/supabase";

export interface AppState {
    isOnboarded: boolean;
    backupActive: boolean;
    selectedPlan: "free" | "backup-plus";
    autoBackupEnabled: boolean;
    backgroundBackupEnabled: boolean;
    photosCount: number;
    lastBackup: string;
    permanence: number;
    encryptionKey: string;
    backupPhrase: string[];
    devices: {
        id: string;
        name: string;
        lastActive: string;
        syncing?: boolean;
    }[];
    photoSource: "photos-app" | "files-app";
}

const defaultState: AppState = {
    isOnboarded: false,
    backupActive: false,
    selectedPlan: "free",
    autoBackupEnabled: true,
    backgroundBackupEnabled: false,
    photosCount: 0,
    lastBackup: "Noch nie",
    permanence: 0,
    encryptionKey: "",
    backupPhrase: [],
    devices: [],
    photoSource: "photos-app",
};

export type Screen = "gallery" | "dashboard" | "settings";

type AppPhase =
    | "loading"
    | "auth"           // No session - show login/signup
    | "unlock"         // Session exists but no local key - show unlock screen
    | "setup"          // Session exists, no vault_key_hash - create new vault
    | "main";          // Fully authenticated with local key

interface AuthUser {
    id: string;
    email: string;
    vaultKeyHash: string | null;
}

export function PhotoVaultApp() {
    const [state, setState] = useState<AppState>(defaultState);
    const [currentScreen, setCurrentScreen] = useState<Screen>("gallery");
    const [appPhase, setAppPhase] = useState<AppPhase>("loading");
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);

    // Better Auth session hook
    const { data: session, isPending: isSessionLoading } = useSession();

    // Register device for authenticated user
    const registerDeviceForUser = useCallback(async (keyHash: string, userId: string) => {
        try {
            const deviceId = getDeviceId();
            const deviceName = getDeviceName();
            const deviceType = getDeviceType();

            await registerDevice(deviceId, deviceName, deviceType, keyHash, userId);
            console.log("Device registered successfully");
        } catch (err) {
            console.error("Failed to register device:", err);
        }
    }, []);

    // Initialize app - check auth state and local key
    useEffect(() => {
        const initializeApp = async () => {
            // Wait for session check to complete
            if (isSessionLoading) return;

            // No session - need to authenticate
            if (!session?.user) {
                setAppPhase("auth");
                return;
            }

            // Have session - check for local encryption key
            const user = session.user as { id: string; email: string; vault_key_hash?: string };
            setAuthUser({
                id: user.id,
                email: user.email,
                vaultKeyHash: user.vault_key_hash || null,
            });

            const localKey = loadKeyFromStorage();

            if (localKey) {
                // Verify local key matches account's vault_key_hash (if set)
                const localKeyHash = await getUserKeyHash(localKey);

                if (user.vault_key_hash && localKeyHash !== user.vault_key_hash) {
                    // Key mismatch - user needs to enter correct recovery phrase
                    console.warn("Local key doesn't match account's vault_key_hash");
                    clearKeyFromStorage();
                    setAppPhase("unlock");
                    return;
                }

                // Register device
                await registerDeviceForUser(localKeyHash, user.id);

                // Ready to go
                setState((prev) => ({ ...prev, isOnboarded: true }));
                setAppPhase("main");
            } else if (user.vault_key_hash) {
                // User has a vault but no local key - need to unlock
                setAppPhase("unlock");
            } else {
                // New user without vault - need to create one
                setAppPhase("setup");
            }
        };

        initializeApp();
    }, [session, isSessionLoading, registerDeviceForUser]);

    // Handle successful auth (login/signup)
    const handleAuthSuccess = useCallback((user: AuthUser) => {
        setAuthUser(user);

        // Check for local key
        const localKey = loadKeyFromStorage();

        if (localKey) {
            // User has local key - verify and proceed
            getUserKeyHash(localKey).then((keyHash) => {
                if (user.vaultKeyHash && keyHash !== user.vaultKeyHash) {
                    clearKeyFromStorage();
                    setAppPhase("unlock");
                } else {
                    registerDeviceForUser(keyHash, user.id);
                    setState((prev) => ({ ...prev, isOnboarded: true }));
                    setAppPhase("main");
                }
            });
        } else if (user.vaultKeyHash) {
            // User has vault but no local key
            setAppPhase("unlock");
        } else {
            // New user - create vault
            setAppPhase("setup");
        }
    }, [registerDeviceForUser]);

    // Handle vault unlock (user entered recovery phrase)
    const handleVaultUnlock = useCallback(async (secretKey: Uint8Array, keyHash: string) => {
        if (!authUser) return;

        // If user doesn't have vault_key_hash set, update it
        if (!authUser.vaultKeyHash) {
            await updateUserVaultKeyHash(authUser.id, keyHash);
            setAuthUser({ ...authUser, vaultKeyHash: keyHash });
        }

        // Register device
        await registerDeviceForUser(keyHash, authUser.id);

        setState((prev) => ({ ...prev, isOnboarded: true }));
        setAppPhase("main");
    }, [authUser, registerDeviceForUser]);

    // Handle new vault creation
    const handleVaultCreated = useCallback(async (keyHash: string) => {
        if (!authUser) return;

        // Update user's vault_key_hash (anchor key to account)
        await updateUserVaultKeyHash(authUser.id, keyHash);
        setAuthUser({ ...authUser, vaultKeyHash: keyHash });

        // Register device
        await registerDeviceForUser(keyHash, authUser.id);

        setState((prev) => ({ ...prev, isOnboarded: true }));
        setAppPhase("main");
    }, [authUser, registerDeviceForUser]);

    // Handle logout
    const handleLogout = useCallback(async () => {
        await signOut();
        clearKeyFromStorage();
        setAuthUser(null);
        setState(defaultState);
        setAppPhase("auth");
    }, []);

    const navigateTo = (screen: Screen) => {
        setCurrentScreen(screen);
    };

    // Loading state
    if (appPhase === "loading" || isSessionLoading) {
        return <ShieldLoader />;
    }

    // Auth screen (login/signup)
    if (appPhase === "auth") {
        return (
            <div className="min-h-screen ios-bg-gray">
                <div className="max-w-[428px] mx-auto min-h-screen bg-[#F2F2F7]">
                    <AuthScreen onSuccess={handleAuthSuccess} />
                </div>
            </div>
        );
    }

    // Unlock vault screen (enter recovery phrase)
    if (appPhase === "unlock" && authUser) {
        return (
            <div className="min-h-screen ios-bg-gray">
                <div className="max-w-[428px] mx-auto min-h-screen bg-[#F2F2F7]">
                    <UnlockVaultScreen
                        userEmail={authUser.email}
                        expectedKeyHash={authUser.vaultKeyHash}
                        onUnlock={handleVaultUnlock}
                        onCreateNewVault={() => setAppPhase("setup")}
                        onLogout={handleLogout}
                    />
                </div>
            </div>
        );
    }

    // Vault setup screen (create new vault)
    if (appPhase === "setup" && authUser) {
        return (
            <div className="min-h-screen ios-bg-gray">
                <div className="max-w-[428px] mx-auto min-h-screen bg-[#F2F2F7]">
                    <VaultSetupScreen
                        userId={authUser.id}
                        onComplete={handleVaultCreated}
                        onBack={() => setAppPhase("unlock")}
                    />
                </div>
            </div>
        );
    }

    // Main app
    return (
        <div className="min-h-screen ios-bg-gray">
            <div className="max-w-[428px] mx-auto min-h-screen bg-[#F2F2F7] flex flex-col">
                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden pb-[80px]">
                    {currentScreen === "gallery" && (
                        <PhotoGallery photosCount={state.photosCount} />
                    )}
                    {currentScreen === "dashboard" && (
                        <Dashboard state={state} setState={setState} />
                    )}
                    {currentScreen === "settings" && (
                        <SettingsPanel
                            state={state}
                            setState={setState}
                            onRestartOnboarding={handleLogout}
                        />
                    )}
                </div>

                {/* Bottom Navigation */}
                <BottomNavigation
                    currentScreen={currentScreen}
                    onNavigate={navigateTo}
                />
            </div>
        </div>
    );
}

// Helper function to update user's vault_key_hash via API
async function updateUserVaultKeyHash(userId: string, keyHash: string): Promise<void> {
    try {
        const response = await fetch("/api/auth/update-vault-key", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, keyHash }),
        });

        if (!response.ok) {
            throw new Error("Failed to update vault key hash");
        }
    } catch (err) {
        console.error("Failed to update vault_key_hash:", err);
        throw err;
    }
}

function BottomNavigation({
    currentScreen,
    onNavigate,
}: {
    currentScreen: Screen;
    onNavigate: (screen: Screen) => void;
}) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 h-[80px] bg-white/80 backdrop-blur-xl border-t border-[#E5E5EA]/50 flex items-start justify-around pt-2 pb-6 max-w-[428px] mx-auto safe-area-bottom">
            {/* Gallery Tab */}
            <button
                onClick={() => onNavigate("gallery")}
                className="flex flex-col items-center gap-1 ios-tap-target px-4"
            >
                <CustomIcon
                    name="image"
                    size={24}
                    className={currentScreen === "gallery" ? "text-[#007AFF]" : "text-[#6E6E73]"}
                />
                <span
                    className={`text-[10px] ${currentScreen === "gallery" ? "text-[#007AFF]" : "text-[#6E6E73]"}`}
                >
                    Galerie
                </span>
            </button>

            {/* Backup Tab */}
            <button
                onClick={() => onNavigate("dashboard")}
                className="flex flex-col items-center gap-1 ios-tap-target px-4"
            >
                <CustomIcon
                    name="shield"
                    size={24}
                    className={currentScreen === "dashboard" ? "text-[#007AFF]" : "text-[#6E6E73]"}
                />
                <span
                    className={`text-[10px] ${currentScreen === "dashboard" ? "text-[#007AFF]" : "text-[#6E6E73]"}`}
                >
                    Backup
                </span>
            </button>

            {/* Settings Tab */}
            <button
                onClick={() => onNavigate("settings")}
                className="flex flex-col items-center gap-1 ios-tap-target px-4"
            >
                <Settings
                    className={`w-6 h-6 ${currentScreen === "settings" ? "text-[#007AFF]" : "text-[#6E6E73]"}`}
                />
                <span
                    className={`text-[10px] ${currentScreen === "settings" ? "text-[#007AFF]" : "text-[#6E6E73]"}`}
                >
                    Einstellungen
                </span>
            </button>
        </nav>
    );
}
