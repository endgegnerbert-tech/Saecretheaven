
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Copy,
  Check,
  Shield,
  Eye,
  Clock,
  AlertTriangle,
  QrCode,
} from "lucide-react";
import { encryptWithPassword } from "@/lib/crypto";
import { QRCodeSVG } from "qrcode.react";

interface SecureShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  photo: any; // Using any to avoid complex type dragging from parent
  secretKey: Uint8Array | null;
}

export function SecureShareDialog({
  isOpen,
  onClose,
  photo,
  secretKey,
}: SecureShareDialogProps) {
  const [step, setStep] = useState<"config" | "processing" | "success">("config");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCreateLink = async () => {
    if (!password) {
      setError("Bitte lege ein Passwort fest.");
      return;
    }
    if (!secretKey || !photo) return;

    setStep("processing");
    setError(null);

    try {
      // 1. Fetch original encrypted blob
      let encryptedBlob: Blob | undefined;
      
      // Try fetching from IPFS (canonical source)
      if (photo.cid) {
        encryptedBlob = await import('@/lib/storage/remote-storage').then(m => m.remoteStorage.download(photo.cid));
      }

      if (!encryptedBlob) throw new Error("Could not load original file");

      // 2. Decrypt locally with User's Vault Key
      // Dynamic import to avoid cycles/SSR issues with crypto? Actually standard import is fine.
      const { decryptFile, encrypt, generateKeyPair, encryptWithPassword } = await import('@/lib/crypto');
      const { remoteStorage } = await import('@/lib/storage/remote-storage'); // Dynamic import to be safe

      const originalMime = photo.metadata?.mimeType || 'image/jpeg';
      const decryptedBlob = await decryptFile(
        encryptedBlob,
        photo.metadata.nonce,
        secretKey,
        originalMime
      );

      if (!decryptedBlob) throw new Error("Decryption failed");

      // 3. Generate Ephemeral Share Key
      // We use a fresh Box KeyPair or just a Secret Key?
      // "Photo Vault" uses SecretBox (Symmetric). Let's stick to that.
      // Generate random 32 bytes.
      const ephemeralKey = new Uint8Array(32);
      crypto.getRandomValues(ephemeralKey);

      // 4. Encrypt with Ephemeral Key
      const arrayBuffer = await decryptedBlob.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      // Use "padData" logic from encryptFileMainThread? 
      // Reuse `encrypt` helper which is low level.
      // We should probably use `encryptFile` logic but with our ephemeral key.
      // `encrypt` helper in crypto.ts pads? No, `encryptFileMainThread` pads.
      // Let's manually do it to ensure compatibility with `decryptFile` on recipient.
      
      // Import padData? Not exported.
      // Let's duplicate pad/encrypt logic or expose it.
      // Easiest: Use `encrypt` but remember to PAD if `decryptFile` expects it.
      // `decryptFile` CALLS `unpadData`. So YES we must pad.
      // Since I can't import `padData` (not exported?), I'll assume I can just use `encryptFile` helper if I mock a `File` object.
      // But `encryptFile` takes a `File`. We have a `Blob`.
      
      // Hack: Create a File object from Blob
      const fileToEncrypt = new File([decryptedBlob], photo.metadata?.fileName || 'share.jpg', { type: originalMime });
      
      // CAREFUL: `encryptFile` implementation in `crypto.ts` likely uses the Worker.
      // It should work fine.
      // Note: `encryptFile` is exported.
      // Wait, I need to use the `encryptFile` function from `crypto.ts`.
      
      // We can create a temporary specialized `encryptFile` call?
      // No, just use `encryptFile(fileToEncrypt, ephemeralKey)`.
      
      // But `encryptFile` is defined in `crypto.ts`. I need to import it.
      const { encryptFile: encryptFileFn } = await import('@/lib/crypto');
      const { encrypted: reEncryptedBlob, nonce: newNonce } = await encryptFileFn(fileToEncrypt, ephemeralKey);

      // 5. Upload to IPFS (or Supabase Storage acting as Burner Storage)
      // Ideally separate bucket with strict lifecycle (24h).
      // For now, use same IPFS logic but maybe different metadata/tracking?
      // Use `remoteStorage.upload`.
      
      const newCid = await remoteStorage.upload(
         new File([reEncryptedBlob], 'secure-share.bin'),
         'secure-share.bin',
         (progress: number) => console.log('Share upload:', progress)
      );

      if (!newCid) throw new Error("Upload failed");

      // 6. Encrypt Metadata (Payload) with User Password
      // Payload: CID + Key + Nonce + MimeType + FileName
      const payload = JSON.stringify({
        cid: newCid,
        key: Buffer.from(ephemeralKey).toString('base64'), // Use Buffer or btoa
        nonce: newNonce,
        mimeType: originalMime,
        fileName: photo.metadata?.fileName || 'shared-image.jpg'
      });

      const encryptedPayloadObj = await encryptWithPassword(payload, password);
      // encryptedPayloadObj contains { ciphertext, nonce, salt } all base64 strings.

      // 7. Send to API
      const response = await fetch('/api/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            encryptedPayload: JSON.stringify(encryptedPayloadObj), // Store as string
            passwordSalt: encryptedPayloadObj.salt, // Redundant but explicit
            expiresIn: 24 * 60 * 60 * 1000 // 24 hours
        })
      });

      if (!response.ok) throw new Error("API Creation failed");
      const { id } = await response.json();

      // 8. Success
      setShareLink(`${window.location.origin}/s/${id}`);
      setStep("success");

    } catch (e) {
        console.error("Share creation failed", e);
        setError("Fehler beim Erstellen des Links.");
        setStep("config");
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white rounded-2xl p-0 overflow-hidden z-[200]">
        {step === "config" && (
            <div className="p-6">
                <DialogHeader className="mb-4">
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                        <Shield className="w-6 h-6 text-blue-600" />
                    </div>
                    <DialogTitle className="text-center text-xl">Sicher Teilen</DialogTitle>
                    <DialogDescription className="text-center">
                        Erstelle einen Link, der sich nach dem Ansehen selbst zerstört.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Zugriffscode festlegen</Label>
                        <Input 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Code eingeben (z.B. 1234)"
                            type="text" // Show clear text for better UX or password? User choice. Let's show text as "Burner" codes are usually simple.
                            className="text-center font-mono text-lg tracking-widest"
                            autoFocus
                        />
                        <p className="text-xs text-gray-500 text-center">
                            Teile diesen Code <b>separat</b> mit dem Empfänger.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                            <Eye className="w-3 h-3" />
                            1x Ansehen
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            Läuft ab in 24h
                        </div>
                    </div>

                    <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 h-10 rounded-xl"
                        onClick={handleCreateLink}
                        disabled={!password || !secretKey}
                    >
                        Link erstellen
                    </Button>
                </div>
            </div>
        )}

        {step === "processing" && (
            <div className="p-12 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <h3 className="font-semibold text-gray-900">Wird sicher verpackt...</h3>
                <p className="text-sm text-gray-500 mt-1">Bild wird neu verschlüsselt und hochgeladen.</p>
            </div>
        )}

        {step === "success" && (
             <div className="p-6 space-y-6">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                        <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Link bereit!</h2>
                    <p className="text-sm text-gray-500">Gültig für **eine einmalige Ansicht**.</p>
                </div>

                <div className="bg-white rounded-xl flex flex-col items-center border border-gray-100 p-4">
                    <QRCodeSVG value={shareLink} size={150} level="M" />
                </div>

                 <div className="space-y-3">
                    <div className="flex gap-2">
                        <Input value={shareLink} readOnly className="bg-gray-50 text-sm font-mono" />
                        <Button onClick={() => {
                            navigator.clipboard.writeText(shareLink);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                        }} variant="outline" size="icon">
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                    </div>
                    
                    <div className="p-3 bg-amber-50 text-amber-800 rounded-lg text-xs flex gap-2">
                         <AlertTriangle className="w-4 h-4 shrink-0" />
                         <p>Vergiss nicht, dem Empfänger den Code <b>{password}</b> zu geben.</p>
                    </div>

                    <Button onClick={onClose} variant="ghost" className="w-full">
                        Fertig
                    </Button>
                </div>
             </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
