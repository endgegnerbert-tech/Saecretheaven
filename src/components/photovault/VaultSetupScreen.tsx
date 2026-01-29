"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CustomIcon } from "@/components/ui/custom-icon";
import ShieldLoader from "@/components/ui/shield-loader";
import { useEncryption } from "@/hooks/use-encryption";
import { Check, Copy, CheckCircle, Smartphone, Cloud, Lock } from "lucide-react";

interface VaultSetupScreenProps {
    userId: string;
    onComplete: (keyHash: string) => void;
    onBack: () => void;
}

type SetupStep = "intro" | "generating" | "phrase" | "confirm";

export function VaultSetupScreen({ userId, onComplete, onBack }: VaultSetupScreenProps) {
    const [step, setStep] = useState<SetupStep>("intro");
    const [phraseConfirmed, setPhraseConfirmed] = useState(false);
    const [copied, setCopied] = useState(false);

    const { isGeneratingKey, generateNewKey, recoveryPhrase, userKeyHash, hasKey, isInitialized } = useEncryption();

    // If user already has a key (from previous session), skip to phrase screen
    // This ensures they see and can write down their recovery phrase
    useEffect(() => {
        if (isInitialized && hasKey && recoveryPhrase && userKeyHash) {
            console.log("Existing key found - showing recovery phrase for anchoring");
            setStep("phrase");
        }
    }, [isInitialized, hasKey, recoveryPhrase, userKeyHash]);

    const handleCreateVault = async () => {
        setStep("generating");
        try {
            await generateNewKey();
            setStep("phrase");
        } catch (err) {
            console.error("Failed to generate key:", err);
            setStep("intro");
        }
    };

    const handleCopyPhrase = async () => {
        if (recoveryPhrase) {
            await navigator.clipboard.writeText(recoveryPhrase);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleConfirmPhrase = () => {
        if (userKeyHash) {
            onComplete(userKeyHash);
        }
    };

    // Parse phrase into words for display
    const phraseWords = recoveryPhrase?.split("-").slice(0, 12) || [];

    // Show loader during key generation or initialization
    if (step === "generating" || isGeneratingKey || !isInitialized) {
        return <ShieldLoader />;
    }

    // Intro step
    if (step === "intro") {
        return (
            <div className="min-h-screen flex flex-col px-6 pt-12 pb-8 safe-area-inset bg-[#FAFBFC]">
            <button
                onClick={onBack}
                className="self-start text-blue-600 text-[17px] mb-8 hover:underline font-medium"
            >
                ← Back
            </button>

                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="mb-6 p-4 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                        <CustomIcon name="key" size={64} className="text-blue-600" />
                    </div>

                    <h1 className="text-3xl font-bold mb-3 text-gray-900 dark:text-white">
                        Create your Vault
                    </h1>
                    <p className="text-[17px] text-blue-600 dark:text-blue-400 max-w-[300px] mb-8 font-medium">
                        Your personal encryption key protects all your photos
                    </p>

                    {/* Features */}
                    <div className="w-full max-w-[320px] space-y-4 mb-8">
                        <div className="p-4 bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 flex items-start gap-4">
                            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                                <Lock className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="text-left">
                                <p className="text-[16px] font-semibold text-gray-900 dark:text-white">Zero-Knowledge</p>
                                <p className="text-[13px] text-gray-500">
                                    Only you can decrypt your photos
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 flex items-start gap-4">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                                <CheckCircle className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="text-left">
                                <p className="text-[16px] font-semibold text-gray-900 dark:text-white">Recovery Phrase</p>
                                <p className="text-[13px] text-gray-500">
                                    12 words for recovery
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 flex items-start gap-4">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                                <Smartphone className="w-6 h-6 text-orange-500" />
                            </div>
                            <div className="text-left">
                                <p className="text-[16px] font-semibold text-gray-900 dark:text-white">Multi-Device</p>
                                <p className="text-[13px] text-gray-500">
                                    Synchronize all your devices
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <Button
                    onClick={handleCreateVault}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-14 text-lg font-semibold shadow-lg shadow-blue-500/20"
                    size="lg"
                >
                    Create Vault
                </Button>
            </div>
        );
    }

    // Show recovery phrase
    if (step === "phrase") {
        return (
        <div className="min-h-screen flex flex-col px-6 pt-12 pb-8 safe-area-inset bg-[#FAFBFC]">
            <div className="flex-1">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
                        Your Phrase
                    </h1>
                    <p className="text-[15px] text-gray-500">
                        Write down these words securely. You'll need them for recovery.
                    </p>
                </div>

                {/* 12 words in Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {phraseWords.map((word, index) => (
                        <div
                            key={index}
                            className="p-3 text-center bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm"
                        >
                            <span className="text-[11px] text-gray-400 block mb-0.5 uppercase tracking-wider">
                                {index + 1}
                            </span>
                            <span className="text-[16px] font-mono font-medium text-gray-900 dark:text-white break-all">
                                {word}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Copy button */}
                <button
                    onClick={handleCopyPhrase}
                    className="w-full py-3 text-blue-600 text-[16px] hover:underline mb-4 font-medium flex items-center justify-center gap-2"
                >
                    <Copy className="w-4 h-4" />
                    {copied ? "Copied!" : "Copy Phrase"}
                </button>

                {/* Warning Card */}
                <div className="mb-6">
                    <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl">
                        <p className="text-[13px] text-red-600 dark:text-red-400 text-center font-medium">
                            Never share these words with others. Anyone with them can access your
                            photos.
                        </p>
                    </div>
                </div>

                {/* Confirmation Toggle */}
                <div className="mb-8">
                    <div className="p-4 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm flex items-center justify-between">
                         <span className="text-[17px] font-medium text-gray-900 dark:text-white">
                            Stored securely?
                        </span>
                        <Switch
                            checked={phraseConfirmed}
                            onCheckedChange={setPhraseConfirmed}
                        />
                    </div>
                </div>
            </div>

            <Button
                onClick={handleConfirmPhrase}
                disabled={!phraseConfirmed}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-14 text-lg font-semibold shadow-lg shadow-blue-500/20"
                size="lg"
            >
                Continue
            </Button>
        </div>
        );
    }

    return null;
}
