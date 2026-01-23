"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { CustomIcon } from "@/components/ui/custom-icon";
import {
    recoveryPhraseToKey,
    saveKeyToStorage,
    getUserKeyHash,
} from "@/lib/crypto";

interface UnlockVaultScreenProps {
    userEmail: string;
    expectedKeyHash: string | null;
    onUnlock: (secretKey: Uint8Array, keyHash: string) => void;
    onCreateNewVault: () => void;
    onLogout: () => void;
}

export function UnlockVaultScreen({
    userEmail,
    expectedKeyHash,
    onUnlock,
    onCreateNewVault,
    onLogout,
}: UnlockVaultScreenProps) {
    const [phrase, setPhrase] = useState("");
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUnlock = async () => {
        if (!phrase.trim()) {
            setError("Bitte gib deine Recovery-Phrase ein");
            return;
        }

        setIsUnlocking(true);
        setError(null);

        try {
            // Normalize input
            const normalizedPhrase = phrase
                .trim()
                .replace(/[\s\n]+/g, "-")
                .replace(/-+/g, "-");

            // Try to decode the key
            const secretKey = recoveryPhraseToKey(normalizedPhrase);

            if (!secretKey || secretKey.length !== 32) {
                setError("Ungueltige Recovery-Phrase");
                setIsUnlocking(false);
                return;
            }

            // Calculate key hash
            const keyHash = await getUserKeyHash(secretKey);

            // If user already has a vault, verify the key hash matches
            if (expectedKeyHash && keyHash !== expectedKeyHash) {
                setError(
                    "Diese Recovery-Phrase gehoert nicht zu diesem Konto. Bitte ueberpruefe deine Eingabe."
                );
                setIsUnlocking(false);
                return;
            }

            // Save key to local storage
            saveKeyToStorage(secretKey);

            // Success
            onUnlock(secretKey, keyHash);
        } catch (err) {
            console.error("Unlock error:", err);
            setError("Ungueltige Recovery-Phrase. Bitte ueberpruefe deine Eingabe.");
        } finally {
            setIsUnlocking(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col px-6 pt-12 pb-8 safe-area-inset bg-[#F2F2F7]">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="text-[13px] text-[#6E6E73]">
                    Angemeldet als
                    <br />
                    <span className="text-[#1D1D1F] font-medium">{userEmail}</span>
                </div>
                <button
                    onClick={onLogout}
                    className="text-[#FF3B30] text-[15px] ios-tap-target"
                >
                    Abmelden
                </button>
            </div>

            <div className="flex-1 flex flex-col">
                {/* Icon & Title */}
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-20 h-20 rounded-full bg-[#007AFF]/10 flex items-center justify-center mb-6">
                        <CustomIcon name="lock" size={40} />
                    </div>
                    <h1 className="sf-pro-display text-[28px] font-bold text-[#1D1D1F] mb-2">
                        Vault entsperren
                    </h1>
                    <p className="text-[15px] text-[#6E6E73] max-w-[300px]">
                        {expectedKeyHash
                            ? "Gib deine Recovery-Phrase ein, um auf deine verschluesselten Fotos zuzugreifen"
                            : "Du hast noch keinen Vault. Erstelle einen neuen oder stelle einen bestehenden wieder her."}
                    </p>
                </div>

                {/* Recovery Phrase Input */}
                <div className="mb-6">
                    <label className="text-[13px] text-[#6E6E73] mb-2 block">
                        Recovery-Phrase (12 Woerter)
                    </label>
                    <textarea
                        value={phrase}
                        onChange={(e) => {
                            setPhrase(e.target.value);
                            setError(null);
                        }}
                        placeholder="abc123XY-def456AB-ghi789CD-..."
                        className="w-full h-[120px] bg-white rounded-xl p-4 text-[15px] text-[#1D1D1F] font-mono resize-none border border-[#E5E5EA] focus:border-[#007AFF] focus:outline-none transition-colors"
                    />
                    <p className="text-[12px] text-[#8E8E93] mt-2">
                        Mit Bindestrichen oder Leerzeichen getrennt
                    </p>
                </div>

                {error && (
                    <div className="bg-[#FF3B30]/10 rounded-xl p-3 mb-6">
                        <p className="text-[14px] text-[#FF3B30] text-center">{error}</p>
                    </div>
                )}

                {/* Info Box */}
                <div className="bg-[#007AFF]/5 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-[#007AFF] mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-[13px] text-[#1D1D1F] font-medium mb-1">
                                Warum brauche ich die Phrase?
                            </p>
                            <p className="text-[12px] text-[#6E6E73]">
                                Deine Fotos sind lokal verschluesselt. Nur mit der Recovery-Phrase
                                kannst du sie entschluesseln. Wir speichern sie niemals.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
                <button
                    onClick={handleUnlock}
                    disabled={isUnlocking || !phrase.trim()}
                    className="w-full h-[54px] bg-[#007AFF] text-white text-[17px] font-semibold rounded-2xl ios-tap-target disabled:opacity-50 flex items-center justify-center"
                >
                    {isUnlocking ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        "Vault entsperren"
                    )}
                </button>

                {!expectedKeyHash && (
                    <button
                        onClick={onCreateNewVault}
                        className="w-full h-[50px] text-[#007AFF] text-[17px] ios-tap-target"
                    >
                        Neuen Vault erstellen
                    </button>
                )}
            </div>
        </div>
    );
}
