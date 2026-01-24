"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, Check, Cloud } from "lucide-react";
import { CustomIcon } from "@/components/ui/custom-icon";
import type { AppState } from "./PhotoVaultApp";
import { useEncryption } from "@/hooks/use-encryption";
import { getDevicesForUser, uploadCIDMetadata, cidExistsInSupabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/deviceId";
import { remoteStorage } from "@/lib/storage/remote-storage";
import { getAllPhotos } from "@/lib/storage/local-db";
import { getUserKeyHash } from "@/lib/crypto";

// Helper to format date
function formatDate(dateStr?: string): string {
  if (!dateStr) return "Unbekannt";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Gerade eben";
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  return date.toLocaleDateString("de-DE");
}

interface SettingsPanelProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onRestartOnboarding: () => void;
}

interface Device {
  id: string;
  device_name: string;
  device_type?: string;
  created_at?: string;
}

import { useSettingsStore } from "@/lib/storage/settings-store";

export function SettingsPanel({
  state,
  setState,
  onRestartOnboarding,
}: SettingsPanelProps) {
  const [showDevices, setShowDevices] = useState(false);
  const [showPhraseWarning, setShowPhraseWarning] = useState(false);
  const [showNewKeyWarning, setShowNewKeyWarning] = useState(false);
  const [showBackupPhrase, setShowBackupPhrase] = useState(false);
  const [showSourceSelector, setShowSourceSelector] = useState(false);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [realDevices, setRealDevices] = useState<Device[]>([]);

  // Manual Backup State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  // Persistent Settings
  const autoBackupEnabled = useSettingsStore(state => state.autoBackupEnabled);
  const setAutoBackupEnabled = useSettingsStore(state => state.setAutoBackupEnabled);
  const backgroundBackupEnabled = useSettingsStore(state => state.backgroundBackupEnabled);
  const setBackgroundBackupEnabled = useSettingsStore(state => state.setBackgroundBackupEnabled);
  const selectedPlan = useSettingsStore(state => state.selectedPlan);
  const setSelectedPlan = useSettingsStore(state => state.setSelectedPlan);
  const setLastBackup = useSettingsStore(state => state.setLastBackup);

  const { secretKey, recoveryPhrase, generateNewKey, clearKey } = useEncryption();
  const currentDeviceId = typeof window !== "undefined" ? getDeviceId() : "";
  const [userKeyHash, setUserKeyHash] = useState<string | null>(null);

  // Get userKeyHash
  useEffect(() => {
    if (secretKey) {
      import("@/lib/crypto").then(m => m.getUserKeyHash(secretKey)).then(setUserKeyHash);
    }
  }, [secretKey]);

  // Fetch real devices from Supabase using hash (aggregates all devices with same key)
  useEffect(() => {
    if (!userKeyHash) return;

    const fetchDevices = async () => {
      try {
        const devices = await getDevicesForUser(userKeyHash);
        setRealDevices(devices as Device[]);
      } catch (err) {
        console.error("Failed to fetch devices:", err);
      }
    };

    fetchDevices();
  }, [userKeyHash]);

  // Get the real backup phrase words
  const realBackupPhraseWords = recoveryPhrase?.split("-").slice(0, 12) || [];

  const toggleAutoBackup = () => {
    setAutoBackupEnabled(!autoBackupEnabled);
  };

  const toggleBackgroundBackup = () => {
    setBackgroundBackupEnabled(!backgroundBackupEnabled);
  };

  // Manual backup: Upload local photos to IPFS that aren't already there
  const triggerManualBackup = async () => {
    if (isUploading || !secretKey) return;

    setIsUploading(true);
    console.log("[Backup] Starting manual backup to IPFS...");

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
          // Check if already in Supabase metadata for this user
          const existsInSupabase = await cidExistsInSupabase(photo.cid, keyHash);

          if (!existsInSupabase) {
            // Upload encrypted blob to IPFS
            const newCid = await remoteStorage.upload(photo.encryptedBlob, photo.fileName);
            console.log(`[Backup] Uploaded to IPFS: ${newCid}`);

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
          console.error(`[Backup] Failed to upload ${photo.cid}:`, err);
        }
      }

      setLastBackup("Gerade eben");
      console.log(`[Backup] Complete: ${uploaded} photos processed`);
    } catch (err) {
      console.error("[Backup] Failed:", err);
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const viewBackupPhrase = () => {
    setShowPhraseWarning(false);
    setShowBackupPhrase(true);
  };

  const handleGenerateNewKey = async () => {
    clearKey();
    const newPhrase = await generateNewKey();

    if (newPhrase) {
      setState((prev) => ({
        ...prev,
        photosCount: 0,
      }));
    }

    setShowNewKeyWarning(false);
  };

  const addDevice = () => {
    // Show the pairing modal
    setShowDevices(false);
    // Since DevicePairing is normally inside Dashboard, 
    // we should probably have it available here too or trigger a global state.
    // In this component, we can just add the DevicePairing modal here as well.
    setShowPairingFromSettings(true);
  };

  const [showPairingFromSettings, setShowPairingFromSettings] = useState(false);
  const [showClearCacheWarning, setShowClearCacheWarning] = useState(false);

  const handleClearCache = async () => {
    try {
      // Clear IndexedDB (Dexie)
      const { db } = await import("@/lib/storage/local-db");
      await db.delete();
      
      // Clear local storage
      localStorage.clear();
      
      // Force reload to clean state
      window.location.reload();
    } catch (err) {
      console.error("Failed to clear cache:", err);
    }
  };

  const changeSource = (source: "photos-app" | "files-app") => {
    console.log("Update backup source preference:", source);
    setState((prev) => ({ ...prev, photoSource: source }));
    setShowSourceSelector(false);
  };

  const changePlan = (plan: "free" | "backup-plus") => {
    console.log("Update plan:", plan);
    setSelectedPlan(plan);
    setShowPlanSelector(false);
  };

  if (showDevices) {
    // Transform real devices into the format expected by DevicesView
    const displayDevices = realDevices.map((device) => ({
      id: device.id,
      name: device.device_name || "Unbekanntes Gerät",
      lastActive: device.id === currentDeviceId ? "Aktiv" : formatDate(device.created_at),
      syncing: false,
    }));

    // If no devices in DB, show current device
    if (displayDevices.length === 0) {
      displayDevices.push({
        id: currentDeviceId,
        name: "Dieses Gerät",
        lastActive: "Aktiv",
        syncing: false,
      });
    }

    return (
      <DevicesView
        devices={displayDevices}
        onBack={() => setShowDevices(false)}
        onAddDevice={addDevice}
      />
    );
  }

  return (
    <div className="h-full flex flex-col pb-4 overflow-y-auto">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 bg-[#F2F2F7]">
        <h1 className="sf-pro-display text-[28px] text-[#1D1D1F]">
          Einstellungen
        </h1>
      </header>

      <div className="flex-1 px-5">
        {/* Backup Settings Section */}
        <div className="mb-6">
          <h2 className="text-[13px] font-semibold text-[#6E6E73] uppercase tracking-wide px-4 mb-2">
            Backup
          </h2>
          <div className="bg-white rounded-xl overflow-hidden">
            <SettingsToggleRow
              label="Automatisches Backup"
              description="Neue Fotos automatisch sichern"
              enabled={autoBackupEnabled}
              onToggle={toggleAutoBackup}
            />
            <div className="h-[0.5px] bg-[#E5E5EA] ml-4" />
            <SettingsToggleRow
              label="Hintergrund-Backup"
              description="Weiter sichern wenn App geschlossen"
              enabled={backgroundBackupEnabled}
              onToggle={toggleBackgroundBackup}
            />
            <div className="h-[0.5px] bg-[#E5E5EA] ml-4" />
            <button
              onClick={() => setShowSourceSelector(true)}
              className="w-full flex items-center justify-between p-4 ios-tap-target"
            >
              <div className="flex items-center gap-3">
                <CustomIcon name="folder" size={24} />
                <div className="text-left">
                  <span className="text-[17px] text-[#1D1D1F] block">
                    Backup-Quelle
                  </span>
                  <span className="text-[13px] text-[#6E6E73]">
                    {state.photoSource === "photos-app"
                      ? "Fotos-App"
                      : "Dateien-App"}
                  </span>
                </div>
              </div>
              <CustomIcon name="chevronRight" size={16} />
            </button>
          </div>

          {/* Manual Backup Button */}
          <button
            onClick={triggerManualBackup}
            disabled={isUploading || !secretKey}
            className="w-full h-[50px] bg-[#007AFF] text-white text-[17px] font-semibold rounded-xl mt-3 ios-tap-target disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {uploadProgress.total > 0
                  ? `${uploadProgress.current}/${uploadProgress.total} hochladen...`
                  : "Vorbereiten..."}
              </>
            ) : (
              <>
                <Cloud className="w-5 h-5" />
                Jetzt sichern
              </>
            )}
          </button>
          <p className="text-[13px] text-[#6E6E73] px-4 mt-2 text-center">
            Alle lokalen Fotos in die Cloud hochladen
          </p>
        </div>

        {/* Storage Section */}
        <div className="mb-6">
          <h2 className="text-[13px] font-semibold text-[#6E6E73] uppercase tracking-wide px-4 mb-2">
            Speicher
          </h2>
          <div className="bg-white rounded-xl overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[17px] text-[#1D1D1F]">
                  Aktueller Plan
                </span>
                <span className="text-[15px] font-semibold text-[#007AFF]">
                  {selectedPlan === "free" ? "Free" : "Backup+"}
                </span>
              </div>
              <p className="text-[13px] text-[#6E6E73]">
                {selectedPlan === "free"
                  ? "Fotos auf deinen Geräten"
                  : "200 GB Cloud-Backup"}
              </p>
            </div>
            <div className="h-[0.5px] bg-[#E5E5EA] ml-4" />
            <div className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[15px] text-[#6E6E73]">Verwendet</span>
                <span className="text-[15px] text-[#1D1D1F]">
                  {state.photosCount.toLocaleString()} Fotos (nur lokal)
                </span>
              </div>
            </div>
            <div className="h-[0.5px] bg-[#E5E5EA] ml-4" />
            <button
              onClick={() => setShowPlanSelector(true)}
              className="w-full flex items-center justify-between p-4 ios-tap-target"
            >
              <span className="text-[17px] text-[#007AFF]">
                {selectedPlan === "free"
                  ? "Upgrade zu Backup+"
                  : "Plan verwalten"}
              </span>
              <CustomIcon name="chevronRight" size={16} />
            </button>
          </div>
        </div>

        {/* Devices Section */}
        <div className="mb-6">
          <h2 className="text-[13px] font-semibold text-[#6E6E73] uppercase tracking-wide px-4 mb-2">
            Geräte
          </h2>
          <div className="bg-white rounded-xl overflow-hidden">
            <button
              onClick={() => {
                console.log("Fetch Device List");
                setShowDevices(true);
              }}
              className="w-full flex items-center justify-between p-4 ios-tap-target"
            >
              <div className="flex items-center gap-3">
                <CustomIcon name="smartphone" size={24} />
                <span className="text-[17px] text-[#1D1D1F]">
                  Verbundene Geräte
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] text-[#6E6E73]">
                  {realDevices.length || 1}
                </span>
                <CustomIcon name="chevronRight" size={16} />
              </div>
            </button>
          </div>
        </div>

        {/* Security Section */}
        <div className="mb-6">
          <h2 className="text-[13px] font-semibold text-[#6E6E73] uppercase tracking-wide px-4 mb-2">
            Sicherheit
          </h2>
          <div className="bg-white rounded-xl overflow-hidden">
            <button
              onClick={() => setShowPhraseWarning(true)}
              className="w-full flex items-center justify-between p-4 ios-tap-target"
            >
              <span className="text-[17px] text-[#1D1D1F]">
                Backup-Phrase anzeigen
              </span>
              <CustomIcon name="chevronRight" size={16} />
            </button>
            <div className="h-[0.5px] bg-[#E5E5EA] ml-4" />
            <button
              onClick={() => setShowNewKeyWarning(true)}
              className="w-full flex items-center justify-between p-4 ios-tap-target"
            >
              <span className="text-[17px] text-[#FF3B30]">
                Neuen Schlüssel erstellen
              </span>
              <CustomIcon name="chevronRight" size={16} />
            </button>
          </div>
          <p className="text-[13px] text-[#6E6E73] px-4 mt-2">
            Teile diese Wörter niemals mit anderen.
          </p>
        </div>

        {/* Maintenance Section */}
        <div className="mb-6">
          <h2 className="text-[13px] font-semibold text-[#6E6E73] uppercase tracking-wide px-4 mb-2">
            Wartung
          </h2>
          <div className="bg-white rounded-xl overflow-hidden">
            <button
              onClick={() => setShowClearCacheWarning(true)}
              className="w-full flex items-center justify-between p-4 ios-tap-target"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 flex items-center justify-center text-[#FF9500]">
                  <CustomIcon name="refresh" size={24} />
                </div>
                <span className="text-[17px] text-[#FF9500]">
                  Lokalen Cache leeren
                </span>
              </div>
              <CustomIcon name="chevronRight" size={16} />
            </button>
          </div>
          <p className="text-[13px] text-[#6E6E73] px-4 mt-2">
            Löscht lokale Vorschaubilder und Gerätedaten. Deine Fotos in der Cloud bleiben sicher.
          </p>
        </div>
      </div>

      {/* View Backup Phrase Warning Modal */}
      {showPhraseWarning && (
        <Modal
          title="Sicherheitshinweis"
          message="Deine Backup-Phrase gibt vollen Zugriff auf deine verschlüsselten Fotos. Nur an einem privaten Ort anzeigen."
          confirmLabel="Phrase anzeigen"
          confirmDestructive={false}
          onConfirm={viewBackupPhrase}
          onCancel={() => setShowPhraseWarning(false)}
        />
      )}

      {/* Show Backup Phrase Modal */}
      {showBackupPhrase && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50">
          <div className="bg-white w-full max-w-[428px] rounded-t-2xl p-6 pb-10">
            <h3 className="sf-pro-display text-[20px] text-[#1D1D1F] text-center mb-2">
              Deine Backup-Phrase
            </h3>
            <p className="text-[15px] text-[#6E6E73] text-center mb-4">
              Notiere diese Wörter und bewahre sie sicher auf.
            </p>

            {realBackupPhraseWords.length > 0 ? (
              <>
                {/* Real phrase in grid */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {realBackupPhraseWords.map((word, index) => (
                    <div
                      key={index}
                      className="bg-[#F2F2F7] rounded-lg p-2 text-center"
                    >
                      <span className="text-[11px] text-[#8E8E93] block">
                        {index + 1}
                      </span>
                      <span className="text-[14px] text-[#1D1D1F] font-mono">
                        {word}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Full key for copy */}
                <div className="bg-[#F2F2F7] rounded-xl p-3 mb-4">
                  <p className="text-[11px] text-[#6E6E73] mb-1">Vollständiger Schlüssel:</p>
                  <p className="text-[12px] font-mono text-[#1D1D1F] break-all">
                    {recoveryPhrase}
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-[#FF9500]/10 rounded-xl p-4 mb-4">
                <p className="text-[13px] text-[#FF9500] text-center">
                  Kein Schlüssel gefunden. Bitte erstelle einen neuen Schlüssel.
                </p>
              </div>
            )}

            {/* Warning */}
            <div className="bg-[#FF3B30]/10 rounded-xl p-3 mb-4">
              <p className="text-[13px] text-[#FF3B30] text-center">
                ⚠️ Teile diese Wörter niemals mit anderen
              </p>
            </div>

            <button
              onClick={() => setShowBackupPhrase(false)}
              className="w-full h-[50px] bg-[#007AFF] text-white text-[17px] font-semibold rounded-xl ios-tap-target"
            >
              Fertig
            </button>
          </div>
        </div>
      )}

      {/* Generate New Key Warning Modal */}
      {showNewKeyWarning && (
        <Modal
          title="Datenverlust-Warnung"
          message="Das Erstellen eines neuen Schlüssels löscht alle vorhandenen Backup-Daten permanent. Diese Aktion kann nicht rückgängig gemacht werden."
          confirmLabel="Neuen Schlüssel erstellen"
          confirmDestructive={true}
          onConfirm={handleGenerateNewKey}
          onCancel={() => setShowNewKeyWarning(false)}
        />
      )}

      {/* Source Selector Modal */}
      {showSourceSelector && (
        <SourceSelectorModal
          currentSource={state.photoSource}
          onSelect={changeSource}
          onClose={() => setShowSourceSelector(false)}
        />
      )}

      {/* Plan Selector Modal */}
      {showPlanSelector && (
        <PlanSelectorModal
          currentPlan={selectedPlan}
          onSelect={changePlan}
          onClose={() => setShowPlanSelector(false)}
        />
      )}

      {/* Clear Cache Warning Modal */}
      {showClearCacheWarning && (
        <Modal
          title="Cache leeren?"
          message="Dies wird lokale Vorschaubilder und Gerätedaten löschen. Deine verschlüsselten Fotos in der Cloud bleiben sicher. Die App wird neu geladen."
          confirmLabel="Cache leeren"
          confirmDestructive={true}
          onConfirm={handleClearCache}
          onCancel={() => setShowClearCacheWarning(false)}
        />
      )}

      {/* Device Pairing Modal */}
      <DevicePairing 
        isOpen={showPairingFromSettings} 
        onClose={() => setShowPairingFromSettings(false)} 
      />
    </div>
  );
}

import { DevicePairing } from "@/components/features/settings/DevicePairing";

function SettingsToggleRow({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 ios-tap-target"
    >
      <div className="text-left">
        <p className="text-[17px] text-[#1D1D1F]">{label}</p>
        <p className="text-[13px] text-[#6E6E73] mt-0.5">{description}</p>
      </div>
      <div
        className={`w-[51px] h-[31px] rounded-full p-[2px] shrink-0 ${
          enabled ? "bg-[#30D158]" : "bg-[#E5E5EA]"
        }`}
      >
        <div
          className={`w-[27px] h-[27px] rounded-full bg-white shadow-sm ${
            enabled ? "ml-auto" : ""
          }`}
        />
      </div>
    </button>
  );
}

function DevicesView({
  devices,
  onBack,
  onAddDevice,
}: {
  devices: {
    id: string;
    name: string;
    lastActive: string;
    syncing?: boolean;
  }[];
  onBack: () => void;
  onAddDevice: () => void;
}) {
  return (
    <div className="h-full flex flex-col pb-4 overflow-y-auto">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 bg-[#F2F2F7]">
        <button
          onClick={onBack}
          className="text-[#007AFF] text-[17px] ios-tap-target mb-2"
        >
          ← Zurück
        </button>
        <h1 className="sf-pro-display text-[28px] text-[#1D1D1F]">Geräte</h1>
      </header>

      <div className="flex-1 px-5">
        <div className="bg-white rounded-xl overflow-hidden">
          {devices.map((device, index) => (
            <div key={device.id}>
              {index > 0 && <div className="h-[0.5px] bg-[#E5E5EA] ml-4" />}
              <div className="flex items-center gap-3 p-4">
                <CustomIcon name="smartphone" size={32} />
                <div className="flex-1">
                  <p className="text-[17px] text-[#1D1D1F]">{device.name}</p>
                  <p className="text-[13px] text-[#6E6E73]">
                    {device.lastActive}
                  </p>
                </div>
                {device.syncing ? (
                  <Loader2 className="w-5 h-5 text-[#007AFF] animate-spin" />
                ) : device.lastActive === "Aktiv" ? (
                  <div className="flex items-center gap-1">
                    <Check className="w-4 h-4 text-[#30D158]" />
                    <span className="text-[13px] text-[#30D158] font-medium">
                      Dieses Gerät
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onAddDevice}
          className="w-full flex items-center justify-center gap-2 mt-6 p-4 bg-white rounded-xl ios-tap-target"
        >
          <Plus className="w-5 h-5 text-[#007AFF]" />
          <span className="text-[17px] text-[#007AFF]">
            Neues Gerät verbinden
          </span>
        </button>

        <p className="text-[13px] text-[#6E6E73] text-center mt-3">
          Scanne den QR-Code oder gib deine Backup-Phrase ein
        </p>
      </div>
    </div>
  );
}

function SourceSelectorModal({
  currentSource,
  onSelect,
  onClose,
}: {
  currentSource: "photos-app" | "files-app";
  onSelect: (source: "photos-app" | "files-app") => void;
  onClose: () => void;
}) {
  const sources = [
    {
      id: "photos-app" as const,
      label: "Fotos-App",
      description: "Alle Fotos aus der iOS Foto-Bibliothek",
    },
    {
      id: "files-app" as const,
      label: "Dateien-App",
      description: "Fotos aus einem bestimmten Ordner",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50">
      <div className="bg-white w-full max-w-[428px] rounded-t-2xl p-6 pb-10">
        <h3 className="sf-pro-display text-[20px] text-[#1D1D1F] text-center mb-2">
          Backup-Quelle
        </h3>
        <p className="text-[15px] text-[#6E6E73] text-center mb-6">
          Wo sind deine Fotos gespeichert?
        </p>

        <div className="space-y-3 mb-6">
          {sources.map((source) => (
            <button
              key={source.id}
              onClick={() => onSelect(source.id)}
              className={`w-full p-4 rounded-xl bg-[#F2F2F7] text-left ios-tap-target ${
                currentSource === source.id ? "ring-2 ring-[#007AFF]" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[17px] font-medium text-[#1D1D1F]">
                    {source.label}
                  </p>
                  <p className="text-[13px] text-[#6E6E73] mt-0.5">
                    {source.description}
                  </p>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    currentSource === source.id
                      ? "border-[#007AFF] bg-[#007AFF]"
                      : "border-[#C7C7CC]"
                  }`}
                >
                  {currentSource === source.id && (
                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full h-[44px] text-[#007AFF] text-[17px] ios-tap-target"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

function PlanSelectorModal({
  currentPlan,
  onSelect,
  onClose,
}: {
  currentPlan: "free" | "backup-plus";
  onSelect: (plan: "free" | "backup-plus") => void;
  onClose: () => void;
}) {
  const plans = [
    {
      id: "free" as const,
      label: "FREE",
      subtitle: "Auf deinen Geräten",
      price: "0€/Monat",
      features: [
        "Unbegrenzte Fotos",
        "Zero-Knowledge Verschlüsselung",
        "Multi-Device Sync",
      ],
    },
    {
      id: "backup-plus" as const,
      label: "BACKUP+",
      subtitle: "Dauerhaft im Netz",
      price: "2,99€/Monat",
      features: [
        "Alles von Free",
        "200 GB Cloud-Backup",
        "Schnellere Synchronisierung",
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50">
      <div className="bg-white w-full max-w-[428px] rounded-t-2xl p-6 pb-10 max-h-[80vh] overflow-y-auto">
        <h3 className="sf-pro-display text-[20px] text-[#1D1D1F] text-center mb-2">
          Speicherplan
        </h3>
        <p className="text-[15px] text-[#6E6E73] text-center mb-6">
          Du kannst jederzeit wechseln
        </p>

        <div className="space-y-3 mb-6">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => onSelect(plan.id)}
              className={`w-full p-4 rounded-xl bg-[#F2F2F7] text-left ios-tap-target ${
                currentPlan === plan.id ? "ring-2 ring-[#007AFF]" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-[#007AFF] tracking-wide">
                    {plan.label}
                  </p>
                  <p className="text-[17px] font-semibold text-[#1D1D1F] mt-0.5">
                    {plan.subtitle}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="text-[13px] text-[#6E6E73] flex items-center gap-2"
                      >
                        <span className="text-[#30D158]">✓</span> {feature}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[15px] font-semibold text-[#1D1D1F] mt-3">
                    {plan.price}
                  </p>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    currentPlan === plan.id
                      ? "border-[#007AFF] bg-[#007AFF]"
                      : "border-[#C7C7CC]"
                  }`}
                >
                  {currentPlan === plan.id && (
                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full h-[44px] text-[#007AFF] text-[17px] ios-tap-target"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

function Modal({
  title,
  message,
  confirmLabel,
  confirmDestructive,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmDestructive: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-8">
      <div className="bg-white w-full max-w-[270px] rounded-2xl overflow-hidden">
        <div className="p-4 text-center">
          <h3 className="sf-pro-display text-[17px] text-[#1D1D1F] mb-1">
            {title}
          </h3>
          <p className="text-[13px] text-[#6E6E73] leading-relaxed">
            {message}
          </p>
        </div>
        <div className="border-t border-[#E5E5EA]">
          <button
            onClick={onCancel}
            className="w-full py-3 text-[17px] text-[#007AFF] border-b border-[#E5E5EA] ios-tap-target"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className={`w-full py-3 text-[17px] font-semibold ios-tap-target ${
              confirmDestructive ? "text-[#FF3B30]" : "text-[#007AFF]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
