"use client";

import { useState } from "react";
import { HelpCircle, Link2, Loader2 } from "lucide-react";
import { CustomIcon } from "@/components/ui/custom-icon";
import type { AppState } from "./PhotoVaultApp";
import { useEncryption } from "@/hooks/use-encryption";
import { useGalleryData } from "@/hooks/use-gallery-data";
import { DevicePairing } from "@/components/features/settings/DevicePairing";
import { uploadCIDMetadata, cidExistsInSupabase } from "@/lib/supabase";
import { remoteStorage } from "@/lib/storage/remote-storage";
import { getAllPhotos } from "@/lib/storage/local-db";
import { getDeviceId } from "@/lib/deviceId";
import { getUserKeyHash } from "@/lib/crypto";

interface DashboardProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

import { useSettingsStore } from "@/lib/storage/settings-store";

export function Dashboard({ state, setState }: DashboardProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPairing, setShowPairing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  // Persistent Settings - Using individual selectors for stability
  const backupActive = useSettingsStore((state) => state.backupActive);
  const setBackupActive = useSettingsStore((state) => state.setBackupActive);
  const lastBackup = useSettingsStore((state) => state.lastBackup);
  const setLastBackup = useSettingsStore((state) => state.setLastBackup);
  const permanence = useSettingsStore((state) => state.permanence);

  // Get real photo count from encryption layer
  // Note: hasKey is checked to avoid calling useGalleryData without a key
  const { secretKey, hasKey } = useEncryption();
  const { photoCount, userKeyHash } = useGalleryData(hasKey ? secretKey : null);

  // Use real photo count if available
  const displayPhotoCount = photoCount > 0 ? photoCount : state.photosCount;

  const toggleBackup = () => {
    setShowConfirmDialog(true);
  };

  const confirmToggle = () => {
    const newState = !backupActive;
    setBackupActive(newState);
    setShowConfirmDialog(false);
  };

  // Manual backup: Upload local photos to IPFS that aren't already there
  const triggerManualBackup = async () => {
    if (isUploading || !secretKey) return;

    setIsUploading(true);
    console.log("Starting backup to IPFS...");

    try {
      const photos = await getAllPhotos();
      const photosWithBlobs = photos.filter((p) => p.encryptedBlob);

      setUploadProgress({ current: 0, total: photosWithBlobs.length });

      let uploaded = 0;
      const deviceId = getDeviceId();
      const keyHash = userKeyHash || await getUserKeyHash(secretKey);

      for (const photo of photosWithBlobs) {
        if (!photo.encryptedBlob) continue;

        try {
          // Check if already in Supabase metadata
          const existsInSupabase = await cidExistsInSupabase(photo.cid);

          if (!existsInSupabase) {
            // Upload encrypted blob to IPFS
            const newCid = await remoteStorage.upload(photo.encryptedBlob, photo.fileName);
            console.log(`Uploaded to IPFS: ${newCid}`);

            // Sync metadata to Supabase
            await uploadCIDMetadata(
              newCid,
              photo.fileSize,
              deviceId,
              photo.nonce,
              photo.mimeType,
              keyHash
            );
          }

          uploaded++;
          setUploadProgress({ current: uploaded, total: photosWithBlobs.length });
        } catch (err) {
          console.error(`Failed to upload ${photo.cid}:`, err);
        }
      }

      setLastBackup("Gerade eben");
      console.log(`Backup complete: ${uploaded} photos processed`);
    } catch (err) {
      console.error("Backup failed:", err);
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const tooltips = {
    photos: "Lokal auf deinen Geräten gespeichert",
    lastBackup: "Automatisches Backup alle 6 Stunden",
    permanence: "Fotos sind auf mehreren Geräten gesichert",
  };

  return (
    <div className="h-full flex flex-col px-5 pt-6 pb-4 overflow-y-auto">
      {/* Header */}
      <header className="mb-6">
        <h1 className="sf-pro-display text-[28px] text-[#1D1D1F]">Backup</h1>
        <p className="text-[15px] text-[#6E6E73] mt-1">
          Verschlüsseltes Photo-Backup
        </p>
      </header>

      {/* Status Toggle */}
      <button
        onClick={toggleBackup}
        className="w-full bg-white rounded-xl p-5 mb-3 ios-tap-target"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center ${
                backupActive ? "bg-[#30D158]/10" : "bg-[#E5E5EA]"
              }`}
            >
              <CustomIcon name="shield" size={28} />
            </div>
            <div className="text-left">
              <p className="text-[17px] font-semibold text-[#1D1D1F]">
                Backup {backupActive ? "Aktiv" : "Aus"}
              </p>
              <p className="text-[15px] text-[#6E6E73]">
                {backupActive
                   ? "Deine Fotos werden geschützt"
                   : "Tippe zum Aktivieren"}
              </p>
            </div>
          </div>
          <div
            className={`w-[51px] h-[31px] rounded-full p-[2px] ${
              backupActive ? "bg-[#30D158]" : "bg-[#E5E5EA]"
            }`}
          >
            <div
              className={`w-[27px] h-[27px] rounded-full bg-white shadow-sm transition-transform duration-200 transform ${
                backupActive ? "translate-x-5" : ""
              }`}
            />
          </div>
        </div>
      </button>

      {/* Help text below toggle */}
      <p className="text-[13px] text-[#6E6E73] px-2 mb-6">
        Automatisch neue Fotos sichern
      </p>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <MetricCard
          icon={<CustomIcon name="image" size={20} />}
          value={displayPhotoCount.toLocaleString()}
          label="Fotos gesichert"
          tooltip={tooltips.photos}
          showTooltip={showTooltip === "photos"}
          onTap={() =>
            setShowTooltip(showTooltip === "photos" ? null : "photos")
          }
        />
        <MetricCard
          icon={<CustomIcon name="clock" size={20} />}
          value={lastBackup}
          label="Letztes Backup"
          tooltip={tooltips.lastBackup}
          showTooltip={showTooltip === "lastBackup"}
          onTap={() =>
            setShowTooltip(showTooltip === "lastBackup" ? null : "lastBackup")
          }
        />
        <MetricCard
          icon={<CustomIcon name="shield" size={20} />}
          value={`${permanence}%`}
          label="Dauerhaft"
          tooltip={tooltips.permanence}
          showTooltip={showTooltip === "permanence"}
          onTap={() =>
            setShowTooltip(showTooltip === "permanence" ? null : "permanence")
          }
        />
      </div>

      {/* Primary Action Button */}
      <button
        onClick={triggerManualBackup}
        disabled={isUploading}
        className={`w-full h-[50px] text-[17px] font-semibold rounded-xl mb-3 ios-tap-target ${
          backupActive
            ? "bg-[#007AFF] text-white"
            : "bg-[#30D158] text-white"
        } disabled:opacity-70 flex items-center justify-center`}
      >
        {isUploading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            {uploadProgress.total > 0
              ? `${uploadProgress.current}/${uploadProgress.total} hochladen...`
              : "Vorbereiten..."}
          </span>
        ) : backupActive ? (
          "Jetzt sichern"
        ) : (
          "Backup aktivieren"
        )}
      </button>

      {/* Link Device Button */}
      <button
        onClick={() => setShowPairing(true)}
        className="w-full h-[50px] text-[17px] font-semibold rounded-xl mb-4 ios-tap-target bg-[#F2F2F7] text-[#007AFF] flex items-center justify-center gap-2"
      >
        <Link2 className="w-5 h-5" />
        Gerät verbinden
      </button>

      {/* Trust Footer */}
      <div className="mt-auto pt-4">
        <p className="text-[15px] text-[#8E8E93] text-center leading-relaxed">
          Deine Fotos sind verschlüsselt.
          <br />
          Niemand kann sie sehen.
        </p>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-8">
          <div className="bg-white w-full max-w-[270px] rounded-2xl overflow-hidden">
            <div className="p-4 text-center">
              <h3 className="sf-pro-display text-[17px] text-[#1D1D1F] mb-1">
                {backupActive
                  ? "Backup deaktivieren?"
                  : "Backup aktivieren?"}
              </h3>
              <p className="text-[13px] text-[#6E6E73] leading-relaxed">
                {backupActive
                  ? "Neue Fotos werden nicht mehr automatisch gesichert."
                  : "Neue Fotos werden automatisch verschlüsselt und gesichert."}
              </p>
            </div>
            <div className="border-t border-[#E5E5EA]">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="w-full py-3 text-[17px] text-[#007AFF] border-b border-[#E5E5EA] ios-tap-target"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmToggle}
                className={`w-full py-3 text-[17px] font-semibold ios-tap-target ${
                  backupActive ? "text-[#FF3B30]" : "text-[#30D158]"
                }`}
              >
                {backupActive ? "Deaktivieren" : "Aktivieren"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Device Pairing Modal */}
      <DevicePairing isOpen={showPairing} onClose={() => setShowPairing(false)} />
    </div>
  );
}

function MetricCard({
  icon,
  value,
  label,
  tooltip,
  showTooltip,
  onTap,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tooltip: string;
  showTooltip: boolean;
  onTap: () => void;
}) {
  return (
    <div className="relative">
      <button
        onClick={onTap}
        className="w-full bg-white rounded-xl p-4 text-center ios-tap-target"
      >
        <div className="flex justify-center mb-2 relative">
          {icon}
          <HelpCircle className="w-3 h-3 text-[#C7C7CC] absolute -right-1 -top-1" />
        </div>
        <p className="text-[17px] font-semibold text-[#1D1D1F] truncate">
          {value}
        </p>
        <p className="text-[11px] text-[#6E6E73]">{label}</p>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-[180px] bg-[#1D1D1F] text-white text-[13px] p-3 rounded-lg z-10 text-center">
          {tooltip}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-[#1D1D1F]" />
        </div>
      )}
    </div>
  );
}
