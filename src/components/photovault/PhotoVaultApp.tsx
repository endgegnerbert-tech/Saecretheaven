"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Settings, AlertTriangle, Copy, X, Shield } from "lucide-react";
import { CustomIcon } from "@/components/ui/custom-icon";
import ShieldLoader from "@/components/ui/shield-loader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

// Screens
import { AuthScreen } from "./AuthScreen";
import { UnlockVaultScreen } from "./UnlockVaultScreen";
import { VaultSetupScreen } from "./VaultSetupScreen";
import { SettingsPanel } from "./SettingsPanel";
import { PhotoGallery } from "./PhotoGallery";
import { BurnerLinksPanel } from "./BurnerLinksPanel";


// Auth
import { useSession, signOut } from "@/lib/auth-client";


// Crypto
import { loadKeyFromStorage, getUserKeyHash, clearKeyFromStorage, keyToRecoveryPhrase } from "@/lib/crypto";

// Recovery Phrase Reminder Modal - shown on first gallery load
function RecoveryPhraseReminder({
    recoveryPhrase,
    onConfirm
}: {
    recoveryPhrase: string;
    onConfirm: () => void;
}) {
    const [confirmed, setConfirmed] = useState(false);
    const [copied, setCopied] = useState(false);

    const phraseWords = recoveryPhrase.split("-").slice(0, 12);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(recoveryPhrase);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Important!
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Save your recovery phrase
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Warning */}
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-4 mb-6">
                        <p className="text-sm text-red-700 dark:text-red-400 font-medium text-center">
                            If you lose this phrase, your photos CANNOT be recovered.
                            We cannot help you - this is zero-knowledge encryption.
                        </p>
                    </div>

                    {/* Phrase Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {phraseWords.map((word, index) => (
                            <div
                                key={index}
                                className="p-2 text-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                            >
                                <span className="text-[10px] text-gray-400 block">
                                    {index + 1}
                                </span>
                                <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                                    {word}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Copy Button */}
                    <button
                        onClick={handleCopy}
                        className="w-full py-2 text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg transition-colors mb-6"
                    >
                        <Copy className="w-4 h-4" />
                        {copied ? "Copied!" : "Copy to clipboard"}
                    </button>

                    {/* Confirmation Toggle */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                I have saved my recovery phrase securely
                            </span>
                            <Switch
                                checked={confirmed}
                                onCheckedChange={setConfirmed}
                            />
                        </div>
                    </div>

                    {/* Continue Button */}
                    <Button
                        onClick={onConfirm}
                        disabled={!confirmed}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl h-12 font-semibold"
                    >
                        Continue to Gallery
                    </Button>
                </div>
            </div>
        </div>
    );
}

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
    lastBackup: "Never",
    permanence: 0,
    encryptionKey: "",
    backupPhrase: [],
    devices: [],
    photoSource: "photos-app",
};

export type Screen = "gallery" | "settings" | "burner-links";


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

// Local storage key for tracking if recovery reminder was shown
const RECOVERY_REMINDER_SHOWN_KEY = "saecretheaven_recovery_reminder_shown";

export function PhotoVaultApp() {
    const [state, setState] = useState<AppState>(defaultState);
    const [currentScreen, setCurrentScreen] = useState<Screen>("gallery");
    const [appPhase, setAppPhase] = useState<AppPhase>("loading");
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);

    // Recovery phrase reminder state
    const [showRecoveryReminder, setShowRecoveryReminder] = useState(false);
    const [recoveryPhraseForReminder, setRecoveryPhraseForReminder] = useState<string | null>(null);

    // Better Auth session hook
    const { data: session, isPending: isSessionLoading } = useSession();

    // Ref-Guard: Verhindert mehrfache Device-Registrierung pro Session
    const hasRegisteredDevice = useRef(false);

    // Register device for authenticated user (nur einmal pro Session)
    const registerDeviceForUser = useCallback(async (keyHash: string, userId: string) => {
        // Guard: Nur einmal registrieren
        if (hasRegisteredDevice.current) {
            console.log("[Device] Already registered this session, skipping");
            return;
        }

        try {
            const deviceId = getDeviceId();
            const deviceName = getDeviceName();
            const deviceType = getDeviceType();

            await registerDevice(deviceId, deviceName, deviceType, keyHash, userId);
            hasRegisteredDevice.current = true; // Markiere als registriert
            console.log("[Device] Registered successfully:", deviceId);
        } catch (err) {
            console.error("[Device] Registration failed:", err);
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

            // Have session - fetch vault_key_hash from API (not session)
            const user = session.user as { id: string; email: string; emailVerified: boolean };

            // STRICT: If email is not verified, do not proceed.
            // This keeps the user on the AuthScreen (where "Check your email" is shown).
            if (!user.emailVerified) {
                console.log("[Auth] User is authenticated but not verified. Staying on AuthScreen.");
                setAppPhase("auth");
                return;
            }

            // Fetch the actual vault_key_hash from the database
            let vaultKeyHash: string | null = null;
            try {
                const response = await fetch("/api/auth/get-vault-key-hash");
                
                if (response.status === 401) {
                    console.warn("Session unauthorized (401) - possibly unverified email.");
                    // If unauthorized, we shouldn't proceed as if logged in
                    setAppPhase("auth");
                    return;
                }

                if (response.ok) {
                    const data = await response.json();
                    vaultKeyHash = data.vaultKeyHash;
                }
            } catch (err) {
                console.error("Failed to fetch vault_key_hash:", err);
            }

            setAuthUser({
                id: user.id,
                email: user.email,
                vaultKeyHash,
            });

            const localKey = loadKeyFromStorage();

            if (localKey) {
                // Verify local key matches account's vault_key_hash (if set)
                const localKeyHash = await getUserKeyHash(localKey);

                if (vaultKeyHash && localKeyHash !== vaultKeyHash) {
                    // Key mismatch - user needs to enter correct recovery phrase
                    console.warn("Local key doesn't match account's vault_key_hash");
                    clearKeyFromStorage();
                    setAppPhase("unlock");
                    return;
                }

                // CRITICAL: If no vaultKeyHash, user must go through setup to anchor key
                if (!vaultKeyHash) {
                    console.log("Local key exists but no vaultKeyHash - showing setup to anchor key");
                    setAppPhase("setup");
                    return;
                }

                // Register device
                await registerDeviceForUser(localKeyHash, user.id);

                // Ready to go
                setState((prev) => ({ ...prev, isOnboarded: true }));
                setAppPhase("main");
            } else if (vaultKeyHash) {
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
    const handleAuthSuccess = useCallback(async (user: AuthUser) => {
        // Fetch the actual vault_key_hash from the database
        let vaultKeyHash: string | null = user.vaultKeyHash;
        try {
            const response = await fetch("/api/auth/get-vault-key-hash");
            
            if (response.status === 401) {
                console.warn("Session unauthorized (401) - possibly unverified email.");
                return;
            }

            if (response.ok) {
                const data = await response.json();
                vaultKeyHash = data.vaultKeyHash;
            }
        } catch (err) {
            console.error("Failed to fetch vault_key_hash:", err);
        }

        const updatedUser = { ...user, vaultKeyHash };
        setAuthUser(updatedUser);

        // Check for local key
        const localKey = loadKeyFromStorage();

        if (localKey) {
            // User has local key - verify and proceed
            const keyHash = await getUserKeyHash(localKey);
            if (vaultKeyHash && keyHash !== vaultKeyHash) {
                clearKeyFromStorage();
                setAppPhase("unlock");
            } else if (!vaultKeyHash) {
                // CRITICAL: Local key exists but no vaultKeyHash - need to anchor key
                console.log("Local key exists but no vaultKeyHash - showing setup to anchor key");
                setAppPhase("setup");
            } else {
                await registerDeviceForUser(keyHash, user.id);
                setState((prev) => ({ ...prev, isOnboarded: true }));
                setAppPhase("main");
            }
        } else if (vaultKeyHash) {
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

        // Get recovery phrase for reminder modal
        const localKey = loadKeyFromStorage();
        if (localKey) {
            const phrase = keyToRecoveryPhrase(localKey);
            setRecoveryPhraseForReminder(phrase);

            // Only show reminder if not shown before for this user
            const reminderKey = `${RECOVERY_REMINDER_SHOWN_KEY}_${authUser.id}`;
            if (!localStorage.getItem(reminderKey)) {
                setShowRecoveryReminder(true);
            }
        }

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

    // Handle recovery reminder confirmation
    const handleRecoveryReminderConfirm = useCallback(() => {
        if (authUser) {
            // Mark as shown for this user
            const reminderKey = `${RECOVERY_REMINDER_SHOWN_KEY}_${authUser.id}`;
            localStorage.setItem(reminderKey, "true");
        }
        setShowRecoveryReminder(false);
        setRecoveryPhraseForReminder(null);
    }, [authUser]);

    const navigateTo = (screen: Screen) => {
        setCurrentScreen(screen);
    };

    // Loading state
    if (appPhase === "loading" || isSessionLoading) {
        return <ShieldLoader />;
    }

    // Auth screen (login/signup)
    if (appPhase === "auth") {
        // Check if we have an unverified session to show the correct initial screen
        const isUnverified = session?.user && !(session.user as any).emailVerified;

        // Also check localStorage for pending verification (signUp without session)
        const pendingVerificationEmail = typeof window !== "undefined"
            ? localStorage.getItem("saecretheaven_pending_verification")
            : null;

        const showVerificationSent = isUnverified || !!pendingVerificationEmail;
        const verificationEmail = session?.user?.email || pendingVerificationEmail || undefined;

        return (
            <div className="min-h-screen ios-bg-gray">
                <div className="max-w-[1200px] mx-auto min-h-screen bg-[#F2F2F7]">
                    <AuthScreen
                        onSuccess={handleAuthSuccess}
                        initialMode={showVerificationSent ? "verification-sent" : "welcome"}
                        userEmail={verificationEmail}
                    />
                </div>
            </div>
        );
    }

    // Unlock vault screen (enter recovery phrase)
    if (appPhase === "unlock" && authUser) {
        return (
            <div className="min-h-screen ios-bg-gray">
                <div className="max-w-[1200px] mx-auto min-h-screen bg-[#F2F2F7]">
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
                <div className="max-w-[1200px] mx-auto min-h-screen bg-[#F2F2F7]">
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
            <div className="max-w-[1200px] mx-auto min-h-screen bg-[#F2F2F7] flex flex-col relative">
                {/* Recovery Phrase Reminder Modal */}
                {showRecoveryReminder && recoveryPhraseForReminder && (
                    <RecoveryPhraseReminder
                        recoveryPhrase={recoveryPhraseForReminder}
                        onConfirm={handleRecoveryReminderConfirm}
                    />
                )}

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden pb-[80px]">
                    {currentScreen === "gallery" && (
                        <PhotoGallery
                            photosCount={state.photosCount}
                            authUser={authUser}
                            onNavigateToBurnerLinks={() => navigateTo("burner-links")}
                        />
                    )}
                    {currentScreen === "settings" && (
                        <SettingsPanel
                            state={state}
                            setState={setState}
                            onRestartOnboarding={handleLogout}
                            authUser={authUser}
                        />
                    )}
                    {currentScreen === "burner-links" && authUser && (
                        <BurnerLinksPanel
                            userId={authUser.id}
                            vaultKeyHash={authUser.vaultKeyHash || ""} // Should be set if main phase
                            onBack={() => navigateTo("gallery")}
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

        if (response.status === 401) {
            console.warn("Session unauthorized (401) - possibly unverified email.");
            return;
        }

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
        <nav className="fixed bottom-0 left-0 right-0 h-[85px] bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 flex items-start justify-around pt-4 pb-8 max-w-[1200px] mx-auto z-40 shadow-lg supports-[backdrop-filter]:bg-opacity-60">
            {/* Gallery Tab */}
            <button
                onClick={() => onNavigate("gallery")}
                className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                    currentScreen === "gallery" ? "scale-100" : "scale-90 opacity-60 hover:opacity-100"
                }`}
            >
                <div className={`p-1.5 rounded-full transition-colors ${
                    currentScreen === "gallery" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
                }`}>
                    <CustomIcon
                        name="image"
                        size={24}
                    />
                </div>
                <span
                    className={`text-[11px] font-medium tracking-wide ${
                        currentScreen === "gallery" ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
                    }`}
                >
                    Gallery
                </span>
            </button>

            {/* Settings Tab */}
            <button
                onClick={() => onNavigate("settings")}
                className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                    currentScreen === "settings" ? "scale-100" : "scale-90 opacity-60 hover:opacity-100"
                }`}
            >
                <div className={`p-1.5 rounded-full transition-colors ${
                    currentScreen === "settings" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
                }`}>
                    <Settings className="w-6 h-6" />
                </div>
                <span
                    className={`text-[11px] font-medium tracking-wide ${
                        currentScreen === "settings" ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
                    }`}
                >
                    Settings
                </span>
            </button>
        </nav>
    );
}
