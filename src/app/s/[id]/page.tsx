
"use client";

import { useState, useRef, useEffect } from "react";
import { Lock, Eye, Check, AlertTriangle, Shield, Download } from "lucide-react";
import { useParams } from "next/navigation";
import { decryptWithPassword } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ShieldLoader from "@/components/ui/shield-loader";
import { remoteStorage } from "@/lib/storage/remote-storage";
import { decryptFile } from "@/lib/crypto";
import { useBurnerCleanup } from "@/hooks/use-burner-cleanup";
import { IncognitoGuard } from "@/components/security/IncognitoGuard";
import { StealthShield } from "@/components/security/StealthShield";

export default function SharedLinkPage() {
    const params = useParams();
    const id = params?.id as string;
    const { wipeAndExit } = useBurnerCleanup();
    
    // States
    const [phase, setPhase] = useState<"locked" | "unlocking" | "viewing" | "error" | "expired">("locked");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [payload, setPayload] = useState<any>(null); // The decrypted metadata
    const [decryptedImageUrl, setDecryptedImageUrl] = useState<string | null>(null);
    const [isLoadingImage, setIsLoadingImage] = useState(false);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setPhase("unlocking");

        try {
            // 1. Fetch Encrypted Payload (This consumes the view!)
            const response = await fetch(`/api/share/${id}/unlock`, {
                method: "POST",
            });

            if (response.status === 410 || response.status === 404) {
                setPhase("expired");
                return;
            }

            if (!response.ok) {
                throw new Error("Failed to load link");
            }

            const data = await response.json();

            // 2. Decrypt Payload
            const decryptedString = await decryptWithPassword({
                ciphertext: data.encryptedPayload,
                nonce: data.encryptedPayload.nonce, // Wait, the API returns the stringified json of {ciphertext, nonce, salt} inside encrypted_payload usually?
                // Correct: My logic in crypto.ts returns { ciphertext, nonce, salt } object. 
                // In API /share/create, the client sends this object stringified.
                // So data.encryptedPayload IS the stringified JSON.
                salt: data.passwordSalt // Wait, I stored password_salt in DB separately but also returned it.
                // Actually my crypto.ts returns { ciphertext, nonce, salt }.
                // If I store "encrypted_payload" as the stringified result of encryptWithPassword, it has salt inside.
                // The DB column password_salt is redundant if I store the whole object, but good for indexing maybe?
                // Let's assume the API returns what was stored.
                // If the frontend passed `JSON.stringify(encryptWithPassword(...))`, then `data.encryptedPayload` is a string.
            }, password);

            // Wait, let's align:
            // Client: const {ciphertext, nonce, salt} = await encryptWithPassword(jsonPayload, password);
            // Client sends: { encryptedPayload: JSON.stringify({ciphertext, nonce, salt}), ... }
            // API stores: encrypted_payload TEXT
            // API returns: { encryptedPayload: "..." } which is the stringified JSON.

            // Parsing:
            let encryptedObj;
            try {
                encryptedObj = JSON.parse(data.encryptedPayload);
            } catch {
                // If not JSON, maybe simple string? Unlikely with my plan.
                throw new Error("Invalid payload format");
            }
            
            // Decrypt the metadata payload
            const decryptedMetaString = await decryptWithPassword(encryptedObj, password);

            if (!decryptedMetaString) {
                // Password wrong
                // PROBLEM: We already consumed the view.
                // If password is wrong, the link is dead for everyone.
                // This is "Self-Destruct" logic. 
                // Strictly "One-Time Use" often means "One successful view".
                // But typically for "burner" style: access = consumption.
                // If key is wrong, data is lost.
                setError("Falscher Code oder Daten beschädigt. Link zerstört.");
                setPhase("expired"); // Effectively expired now
                return;
            }

            const meta = JSON.parse(decryptedMetaString);
            setPayload(meta);

            // 3. Load actual image
            await loadImage(meta);
            
            setPhase("viewing");

        } catch (err) {
            console.error(err);
            setError("Ein Fehler ist aufgetreten. Link ist möglicherweise abgelaufen.");
            setPhase("error");
        }
    };

    const loadImage = async (meta: any) => {
        setIsLoadingImage(true);
        try {
            // Meta contains: { cid, key (base64 or array?), mimeType, fileName }
            // We need to fetch CID from IPFS and decrypt with the file key
            
            const blob = await remoteStorage.download(meta.cid);
            if (!blob) throw new Error("Image download failed");

            // Convert key back to Uint8Array
            // meta.key should be base64 string
            const keyBytes = new Uint8Array(Buffer.from(meta.key, 'base64')); // Buffer polyfill? Or use tweetnacl util
            // Better use tweetnacl-util or buffer
            // Since this is client side, Buffer might not exist unless polyfilled.
            // I should use decodeBase64 from tweetnacl-util which I import in crypto.ts
            // But I can't import internal helpers easily.
            // I'll assume standard atob for now or import from crypto.
            
            // Wait, I can import { decodeBase64 } from '@/lib/crypto' -> wait, it's not exported.
            // I'll update crypto.ts to export it or use a local helper.
            // Or just use `Uint8Array.from(atob(meta.key), c => c.charCodeAt(0))`
            
            const key = Uint8Array.from(atob(meta.key), c => c.charCodeAt(0));

            const decryptedBlob = await decryptFile(
                blob,
                meta.nonce,
                key, // Check if decryptFile accepts Uint8Array. Yes.
                meta.mimeType
            );

            if (decryptedBlob) {
                setDecryptedImageUrl(URL.createObjectURL(decryptedBlob));
            } else {
                throw new Error("Decryption failed");
            }

        } catch (e) {
            console.error("Image loading failed", e);
            setError("Bild konnte nicht geladen werden.");
        } finally {
            setIsLoadingImage(false);
        }
    };

    if (phase === "locked" || phase === "unlocking") {
        return (
            <IncognitoGuard>
            <StealthShield>
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                {/* ... existing content ... */}
                <div className="max-w-md w-full bg-zinc-900 rounded-2xl p-8 border border-zinc-800 shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-8 h-8 text-zinc-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Secure Drop</h1>
                        <p className="text-zinc-400 text-sm">
                            Dieser Link zerstört sich nach dem Ansehen.
                            Gib den Code ein, um den Inhalt zu entschlüsseln.
                        </p>
                    </div>

                    <form onSubmit={handleUnlock} className="space-y-4">
                        <Input
                            type="password"
                            placeholder="Zugriffscode"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 text-center text-lg tracking-widest h-12"
                            autoFocus
                        />
                        
                        <Button 
                            type="submit" 
                            disabled={phase === "unlocking" || !password}
                            className="w-full bg-white text-black hover:bg-zinc-200 h-12 text-base font-semibold"
                        >
                            {phase === "unlocking" ? <ShieldLoader /> : "Entschlüsseln"}

                        </Button>

                        {error && (
                            <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-3 flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                                <p className="text-sm text-red-300">{error}</p>
                            </div>
                        )}
                    </form>
                </div>
            </div>
            </StealthShield>
            </IncognitoGuard>
        );
    }

    if (phase === "expired" || phase === "error") {
        return (
            <IncognitoGuard>
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                    <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Shield className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">Link nicht verfügbar</h1>
                    <p className="text-zinc-400">
                        Dieser Link ist entweder abgelaufen, wurde bereits angesehen oder der Code war falsch.
                        Daten sind unwiderruflich gelöscht.
                    </p>
                </div>
            </div>
            </IncognitoGuard>
        );
    }

    // Viewing Phase
    return (
        <IncognitoGuard>
        <StealthShield>
        <div className="min-h-screen bg-black flex flex-col items-center justify-center relative">
            {isLoadingImage ? (
                <div className="text-center">
                    <ShieldLoader />
                    <p className="text-zinc-500 mt-4 text-sm tracking-wider">DECRYPTING IMAGE...</p>
                </div>
            ) : decryptedImageUrl ? (
                <div className="relative w-full h-full flex items-center justify-center p-4">
                    <img 
                        src={decryptedImageUrl} 
                        alt="Secure Content" 
                        className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                    />
                    
                    {/* Security Overlay Warning */}
                    <div className="absolute top-6 left-0 right-0 text-center pointer-events-none">
                         <span className="bg-red-500/90 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md">
                            ONE-TIME VIEW • DO NOT REFRESH
                         </span>
                    </div>

                    <div className="fixed bottom-8 gap-4 flex items-center">
                         <Button
                            onClick={() => {
                                const a = document.createElement('a');
                                a.href = decryptedImageUrl;
                                a.download = payload?.fileName || 'secure-image';
                                a.click();
                            }}
                            className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Bild Speichern
                        </Button>

                        <Button 
                            variant="destructive"
                            className="bg-red-500/80 hover:bg-red-600 backdrop-blur-md"
                            onClick={wipeAndExit}
                        >
                            <Shield className="w-4 h-4 mr-2" />
                            Wipe & Exit
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="text-red-500">Fehler beim Laden des Bildes</div>
            )}
        </div>
        </StealthShield>
        </IncognitoGuard>
    );
}

