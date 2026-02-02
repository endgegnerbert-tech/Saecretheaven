"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { X, QrCode, Key, Lock } from "lucide-react";
import { useEncryption } from "@/hooks/use-encryption";
import { SketchButton, SketchCard, SketchTextarea } from "@/sketch-ui";
import {
  exportBurnerKeyBundle,
  importBurnerKeyBundle,
  getBurnerKeyCount,
  type BurnerKeyBundle,
} from "@/lib/crypto-asymmetric";

const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((mod) => mod.QRCodeSVG),
  { ssr: false }
);

interface DevicePairingProps {
  isOpen: boolean;
  onClose: () => void;
}

type PairingMode = "show" | "input";

/**
 * Signal-style pairing payload
 * Contains both the vault recovery phrase AND the encrypted burner key bundle
 */
interface PairingPayload {
  v: 1; // Version
  phrase: string; // Recovery phrase
  burnerKeys?: BurnerKeyBundle; // Encrypted burner keys (optional if none exist)
}

export function DevicePairing({ isOpen, onClose }: DevicePairingProps) {
  const [mode, setMode] = useState<PairingMode>("show");
  const [inputKey, setInputKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [importedKeysCount, setImportedKeysCount] = useState(0);

  const { recoveryPhrase, restoreFromPhrase } = useEncryption();

  // Build pairing payload with recovery phrase + burner keys
  const pairingPayload = useMemo(() => {
    if (!recoveryPhrase) return null;

    const payload: PairingPayload = {
      v: 1,
      phrase: recoveryPhrase,
      burnerKeys: exportBurnerKeyBundle() || undefined,
    };

    return JSON.stringify(payload);
  }, [recoveryPhrase]);

  // Count of burner keys to show in UI
  const burnerKeyCount = useMemo(() => getBurnerKeyCount(), []);

  const handleCopyKey = async () => {
    if (!pairingPayload) return;

    try {
      await navigator.clipboard.writeText(pairingPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Failed to copy to clipboard");
    }
  };

  const handleImportKey = () => {
    setError(null);
    setImportedKeysCount(0);

    if (!inputKey.trim()) {
      setError("Please enter a key");
      return;
    }

    const input = inputKey.trim();

    // Try to parse as new JSON payload format
    try {
      const payload = JSON.parse(input) as PairingPayload;

      if (payload.v === 1 && payload.phrase) {
        // New format: restore phrase first
        const phraseSuccess = restoreFromPhrase(payload.phrase);

        if (!phraseSuccess) {
          setError("Invalid recovery phrase in payload.");
          return;
        }

        // Then import burner keys if present
        let keysImported = 0;
        if (payload.burnerKeys) {
          keysImported = importBurnerKeyBundle(payload.burnerKeys);
          setImportedKeysCount(keysImported);
        }

        setSuccess(true);
        setInputKey("");
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 2000);
        return;
      }
    } catch {
      // Not JSON, try as plain recovery phrase (backwards compatible)
    }

    // Fallback: treat as plain recovery phrase
    const phraseSuccess = restoreFromPhrase(input);

    if (phraseSuccess) {
      setSuccess(true);
      setInputKey("");
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } else {
      setError("Invalid key. Please check your input.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-6 backdrop-blur-sm">
      <SketchCard className="bg-white w-full max-w-[380px] p-0 shadow-2xl overflow-hidden">
        {/* Header with Sketch UI */}
        <div className="flex items-center justify-between p-4 border-b-2 border-[#2563EB]/10">
          <h2 className="sketch-heading text-[20px] text-[#1D1D1F]">
            Connect Device
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5"
          >
            <X className="w-5 h-5 text-[#6E6E73]" />
          </button>
        </div>

        {/* Mode Tabs with Sketch UI */}
        <div className="flex border-b-2 border-[#2563EB]/10">
          <button
            onClick={() => setMode("show")}
            className={`flex-1 py-4 sketch-subheading text-[15px] flex items-center justify-center gap-2 transition-colors ${
              mode === "show"
                ? "text-[#2563EB] bg-[#2563EB]/5"
                : "text-[#6E6E73]"
            }`}
          >
            <QrCode className="w-4 h-4" />
            Show
          </button>
          <button
            onClick={() => setMode("input")}
            className={`flex-1 py-4 sketch-subheading text-[15px] flex items-center justify-center gap-2 transition-colors ${
              mode === "input"
                ? "text-[#2563EB] bg-[#2563EB]/5"
                : "text-[#6E6E73]"
            }`}
          >
            Enter
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {mode === "show" ? (
            <div className="flex flex-col items-center">
              <p className="sketch-body text-[14px] text-[#6E6E73] text-center mb-6">
                Scan the QR code or copy the key to pair another device.
              </p>

              {/* QR Code with Sketch Card */}
              {pairingPayload && (
                <div className="mb-6">
                  <SketchCard className="p-4 bg-white">
                    <QRCodeSVG
                      value={pairingPayload}
                      size={180}
                      level="L"
                      includeMargin={false}
                    />
                  </SketchCard>
                </div>
              )}

              {/* Bundle Info */}
              <div className="w-full mb-4">
                <SketchCard className="bg-[#2563EB]/5 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="w-4 h-4 text-[#2563EB]" />
                    <p className="sketch-subheading text-[12px] text-[#1D1D1F]">
                      Pairing includes:
                    </p>
                  </div>
                  <ul className="text-[11px] text-[#6E6E73] space-y-1 ml-6">
                    <li className="flex items-center gap-2">
                      <Lock className="w-3 h-3" />
                      Vault Recovery Phrase
                    </li>
                    {burnerKeyCount > 0 && (
                      <li className="flex items-center gap-2">
                        <Lock className="w-3 h-3" />
                        {burnerKeyCount} Burner Link Key{burnerKeyCount > 1 ? "s" : ""}
                      </li>
                    )}
                  </ul>
                </SketchCard>
              </div>

              {/* Copy Button */}
              <SketchButton
                onClick={handleCopyKey}
                disabled={!pairingPayload}
                className="w-full"
                size="md"
              >
                {copied ? "✓ Copied!" : "Copy Pairing Key"}
              </SketchButton>
            </div>
          ) : (
            <div className="flex flex-col">
              <p className="sketch-body text-[14px] text-[#6E6E73] text-center mb-6">
                Enter the pairing key from your other device.
              </p>

              {/* Key Input with Sketch UI */}
              <SketchTextarea
                value={inputKey}
                onChange={(val) => {
                  setInputKey(val);
                  setError(null);
                }}
                placeholder="Paste pairing key here..."
                rows={4}
                className="mb-4"
              />

              {/* Messages */}
              {error && (
                <p className="sketch-body text-[14px] text-[#FF3B30] text-center mb-4 italic">
                  {error}
                </p>
              )}

              {success && (
                <div className="text-center mb-4">
                  <p className="sketch-body text-[14px] text-[#30D158] font-bold">
                    ✓ Connected!
                  </p>
                  {importedKeysCount > 0 && (
                    <p className="sketch-body text-[12px] text-[#6E6E73] mt-1">
                      Imported {importedKeysCount} burner link key{importedKeysCount > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}

              {/* Import Button */}
              <SketchButton
                onClick={handleImportKey}
                disabled={!inputKey.trim() || success}
                className="w-full"
                size="md"
              >
                {success ? "Connected" : "Connect"}
              </SketchButton>

              {/* Note */}
              <p className="sketch-body text-[11px] text-[#6E6E73] text-center mt-6">
                Note: This replaces your current vault key.
              </p>
            </div>
          )}
        </div>
      </SketchCard>
    </div>
  );
}
