"use client";

import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, Smartphone, Info } from "lucide-react";
import { CustomIcon } from "@/components/ui/custom-icon";
import { signIn, signUp } from "@/lib/auth-client";

interface AuthScreenProps {
    onSuccess: (user: { id: string; email: string; vaultKeyHash: string | null }) => void;
}

type AuthMode = "welcome" | "login" | "signup";

export function AuthScreen({ onSuccess }: AuthScreenProps) {
    const [mode, setMode] = useState<AuthMode>("welcome");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        if (!email || !password) {
            setError("Bitte E-Mail und Passwort eingeben");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await signIn.email({
                email,
                password,
            });

            if (result.error) {
                setError(result.error.message || "Anmeldung fehlgeschlagen");
                return;
            }

            if (result.data?.user) {
                onSuccess({
                    id: result.data.user.id,
                    email: result.data.user.email,
                    vaultKeyHash: (result.data.user as { vault_key_hash?: string }).vault_key_hash || null,
                });
            }
        } catch (err) {
            console.error("Login error:", err);
            setError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = async () => {
        if (!email || !password || !name) {
            setError("Bitte alle Felder ausfuellen");
            return;
        }

        if (password.length < 8) {
            setError("Passwort muss mindestens 8 Zeichen haben");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await signUp.email({
                email,
                password,
                name,
            });

            if (result.error) {
                setError(result.error.message || "Registrierung fehlgeschlagen");
                return;
            }

            if (result.data?.user) {
                onSuccess({
                    id: result.data.user.id,
                    email: result.data.user.email,
                    vaultKeyHash: null, // New user has no vault yet
                });
            }
        } catch (err) {
            console.error("Signup error:", err);
            setError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
        } finally {
            setIsLoading(false);
        }
    };

    // Welcome Screen
    if (mode === "welcome") {
        return (
            <div className="min-h-screen flex flex-col px-6 pt-16 pb-8 safe-area-inset bg-[#F2F2F7]">
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    {/* Logo */}
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center mb-8 shadow-lg">
                        <CustomIcon name="shield" size={48} className="text-white" />
                    </div>

                    <h1 className="sf-pro-display text-[34px] font-bold leading-tight text-[#1D1D1F] mb-3">
                        PhotoVault
                    </h1>
                    <p className="text-[17px] leading-relaxed text-[#6E6E73] max-w-[280px] mb-8">
                        Sichere deine Fotos mit Zero-Knowledge Verschluesselung
                    </p>

                    {/* Features */}
                    <div className="w-full max-w-[320px] space-y-3 mb-12">
                        <FeatureItem icon="lock" text="Ende-zu-Ende verschluesselt" />
                        <FeatureItem icon="smartphone" text="Multi-Device Sync" />
                        <FeatureItem icon="cloud" text="Dezentrales IPFS Backup" />
                    </div>
                </div>

                {/* Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={() => setMode("signup")}
                        className="w-full h-[54px] bg-[#007AFF] text-white text-[17px] font-semibold rounded-2xl ios-tap-target flex items-center justify-center gap-2 shadow-lg shadow-[#007AFF]/25"
                    >
                        Konto erstellen
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setMode("login")}
                        className="w-full h-[50px] text-[#007AFF] text-[17px] font-medium ios-tap-target"
                    >
                        Ich habe bereits ein Konto
                    </button>
                </div>
            </div>
        );
    }

    // Login / Signup Form
    return (
        <div className="min-h-screen flex flex-col px-6 pt-12 pb-8 safe-area-inset bg-[#F2F2F7]">
            {/* Header */}
            <button
                onClick={() => setMode("welcome")}
                className="self-start text-[#007AFF] text-[17px] mb-8 ios-tap-target"
            >
                Zurueck
            </button>

            <div className="flex-1">
                <h1 className="sf-pro-display text-[28px] font-bold text-[#1D1D1F] mb-2">
                    {mode === "login" ? "Willkommen zurueck" : "Konto erstellen"}
                </h1>
                <p className="text-[15px] text-[#6E6E73] mb-8">
                    {mode === "login"
                        ? "Melde dich an, um auf deinen Vault zuzugreifen"
                        : "Erstelle ein Konto, um deinen Vault zu sichern"}
                </p>

                {/* Form */}
                <div className="space-y-4">
                    {mode === "signup" && (
                        <div className="relative">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Name"
                                className="w-full h-[54px] bg-white rounded-xl px-4 pl-12 text-[17px] text-[#1D1D1F] placeholder:text-[#8E8E93] border border-[#E5E5EA] focus:border-[#007AFF] focus:outline-none transition-colors"
                            />
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8E93]" />
                        </div>
                    )}

                    <div className="relative">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="E-Mail"
                            autoComplete="email"
                            className="w-full h-[54px] bg-white rounded-xl px-4 pl-12 text-[17px] text-[#1D1D1F] placeholder:text-[#8E8E93] border border-[#E5E5EA] focus:border-[#007AFF] focus:outline-none transition-colors"
                        />
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8E93]" />
                    </div>

                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Passwort"
                            autoComplete={mode === "login" ? "current-password" : "new-password"}
                            className="w-full h-[54px] bg-white rounded-xl px-4 pl-12 pr-12 text-[17px] text-[#1D1D1F] placeholder:text-[#8E8E93] border border-[#E5E5EA] focus:border-[#007AFF] focus:outline-none transition-colors"
                        />
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8E93]" />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E8E93] ios-tap-target"
                        >
                            {showPassword ? (
                                <EyeOff className="w-5 h-5" />
                            ) : (
                                <Eye className="w-5 h-5" />
                            )}
                        </button>
                    </div>

                    {mode === "signup" && (
                        <p className="text-[13px] text-[#8E8E93]">
                            Mindestens 8 Zeichen
                        </p>
                    )}

                    {error && (
                        <div className="bg-[#FF3B30]/10 rounded-xl p-3">
                            <p className="text-[14px] text-[#FF3B30] text-center">{error}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Submit Button */}
            <div className="space-y-3">
                <button
                    onClick={mode === "login" ? handleLogin : handleSignup}
                    disabled={isLoading}
                    className="w-full h-[54px] bg-[#007AFF] text-white text-[17px] font-semibold rounded-2xl ios-tap-target disabled:opacity-50 flex items-center justify-center"
                >
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : mode === "login" ? (
                        "Anmelden"
                    ) : (
                        "Registrieren"
                    )}
                </button>

                <button
                    onClick={() => setMode(mode === "login" ? "signup" : "login")}
                    className="w-full h-[44px] text-[#007AFF] text-[15px] ios-tap-target"
                >
                    {mode === "login"
                        ? "Noch kein Konto? Registrieren"
                        : "Bereits ein Konto? Anmelden"}
                </button>
            </div>
        </div>
    );
}

function FeatureItem({ icon, text }: { icon: "lock" | "smartphone" | "cloud"; text: string }) {
    return (
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-xl p-3">
            <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center">
                <CustomIcon name={icon} size={18} className="text-[#007AFF]" />
            </div>
            <span className="text-[15px] text-[#1D1D1F]">{text}</span>
        </div>
    );
}
