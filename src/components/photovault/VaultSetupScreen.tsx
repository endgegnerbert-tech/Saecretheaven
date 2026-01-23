"use client";

import { useState } from "react";
import { Check, Copy, CheckCircle } from "lucide-react";
import { CustomIcon } from "@/components/ui/custom-icon";
import ShieldLoader from "@/components/ui/shield-loader";
import { useEncryption } from "@/hooks/use-encryption";

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

    const { isGeneratingKey, generateNewKey, recoveryPhrase, userKeyHash } = useEncryption();

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

    // Show loader during key generation
    if (step === "generating" || isGeneratingKey) {
        return <ShieldLoader />;
    }

    // Intro step
    if (step === "intro") {
        return (
            <div className="min-h-screen flex flex-col px-6 pt-12 pb-8 safe-area-inset bg-[#F2F2F7]">
                <button
                    onClick={onBack}
                    className="self-start text-[#007AFF] text-[17px] mb-8 ios-tap-target"
                >
                    Zurueck
                </button>

                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 rounded-full bg-[#007AFF]/10 flex items-center justify-center mb-6">
                        <CustomIcon name="key" size={40} />
                    </div>

                    <h1 className="sf-pro-display text-[28px] font-bold text-[#1D1D1F] mb-3">
                        Erstelle deinen Vault
                    </h1>
                    <p className="text-[17px] text-[#6E6E73] max-w-[300px] mb-8">
                        Dein persoenlicher Verschluesselungsschluessel schuetzt alle deine Fotos
                    </p>

                    {/* Features */}
                    <div className="w-full max-w-[320px] space-y-3 mb-8">
                        <div className="bg-white rounded-xl p-4 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#30D158]/10 flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-5 h-5 text-[#30D158]" />
                            </div>
                            <div className="text-left">
                                <p className="text-[15px] text-[#1D1D1F] font-medium">Zero-Knowledge</p>
                                <p className="text-[13px] text-[#6E6E73]">
                                    Nur du kannst deine Fotos entschluesseln
                                </p>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-4 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#30D158]/10 flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-5 h-5 text-[#30D158]" />
                            </div>
                            <div className="text-left">
                                <p className="text-[15px] text-[#1D1D1F] font-medium">Recovery-Phrase</p>
                                <p className="text-[13px] text-[#6E6E73]">
                                    12 Woerter zum Wiederherstellen auf neuen Geraeten
                                </p>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-4 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#30D158]/10 flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-5 h-5 text-[#30D158]" />
                            </div>
                            <div className="text-left">
                                <p className="text-[15px] text-[#1D1D1F] font-medium">Multi-Device</p>
                                <p className="text-[13px] text-[#6E6E73]">
                                    Synchronisiere bis zu 3 Geraete
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleCreateVault}
                    className="w-full h-[54px] bg-[#007AFF] text-white text-[17px] font-semibold rounded-2xl ios-tap-target shadow-lg shadow-[#007AFF]/25"
                >
                    Vault erstellen
                </button>
            </div>
        );
    }

    // Show recovery phrase
    if (step === "phrase") {
        return (
            <div className="min-h-screen flex flex-col px-6 pt-12 pb-8 safe-area-inset bg-[#F2F2F7]">
                <div className="flex-1">
                    <div className="text-center mb-6">
                        <h1 className="sf-pro-display text-[28px] font-bold text-[#1D1D1F] mb-2">
                            Deine Recovery-Phrase
                        </h1>
                        <p className="text-[15px] text-[#6E6E73]">
                            Notiere diese Woerter sicher. Du brauchst sie zur Wiederherstellung.
                        </p>
                    </div>

                    {/* 12 words in 3x4 grid */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {phraseWords.map((word, index) => (
                            <div
                                key={index}
                                className="bg-white rounded-lg p-3 text-center border border-[#E5E5EA]"
                            >
                                <span className="text-[11px] text-[#8E8E93] block mb-0.5">
                                    {index + 1}
                                </span>
                                <span className="text-[14px] text-[#1D1D1F] font-mono break-all">
                                    {word}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Copy button */}
                    <button
                        onClick={handleCopyPhrase}
                        className="w-full flex items-center justify-center gap-2 py-3 text-[#007AFF] text-[15px] ios-tap-target mb-4"
                    >
                        {copied ? (
                            <>
                                <Check className="w-5 h-5" />
                                Kopiert!
                            </>
                        ) : (
                            <>
                                <Copy className="w-5 h-5" />
                                Phrase kopieren
                            </>
                        )}
                    </button>

                    {/* Warning */}
                    <div className="bg-[#FF3B30]/10 rounded-xl p-4 mb-6">
                        <p className="text-[13px] text-[#FF3B30] text-center">
                            Teile diese Woerter niemals mit anderen. Wer sie hat, kann auf deine
                            Fotos zugreifen.
                        </p>
                    </div>

                    {/* Checkbox */}
                    <button
                        onClick={() => setPhraseConfirmed(!phraseConfirmed)}
                        className="w-full flex items-center gap-3 p-4 bg-white rounded-xl ios-tap-target"
                    >
                        <div
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                                phraseConfirmed ? "bg-[#007AFF] border-[#007AFF]" : "border-[#C7C7CC]"
                            }`}
                        >
                            {phraseConfirmed && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <span className="text-[17px] text-[#1D1D1F]">
                            Ich habe die Woerter sicher gespeichert
                        </span>
                    </button>
                </div>

                <button
                    onClick={handleConfirmPhrase}
                    disabled={!phraseConfirmed}
                    className={`w-full h-[54px] text-[17px] font-semibold rounded-2xl ios-tap-target transition-colors ${
                        phraseConfirmed
                            ? "bg-[#007AFF] text-white shadow-lg shadow-[#007AFF]/25"
                            : "bg-[#E5E5EA] text-[#8E8E93]"
                    }`}
                >
                    Weiter
                </button>
            </div>
        );
    }

    return null;
}
