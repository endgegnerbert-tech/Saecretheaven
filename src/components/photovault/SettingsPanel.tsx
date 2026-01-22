"use client";

import { useState } from "react";
import { Plus, Loader2, Check } from "lucide-react";
import { CustomIcon } from "@/components/ui/custom-icon";
import type { AppState } from "./PhotoVaultApp";
import { dummyBackupPhrase } from "./PhotoVaultApp";

interface SettingsPanelProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onRestartOnboarding: () => void;
}

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

  const toggleAutoBackup = () => {
    const newValue = !state.autoBackupEnabled;
    console.log("Update Auto-Backup Preference:", newValue);
    setState((prev) => ({ ...prev, autoBackupEnabled: newValue }));
  };

  const toggleBackgroundBackup = () => {
    const newValue = !state.backgroundBackupEnabled;
    console.log("Update Background Preference:", newValue);
    setState((prev) => ({ ...prev, backgroundBackupEnabled: newValue }));
  };

  const viewBackupPhrase = () => {
    console.log("Display Backup Phrase");
    setShowPhraseWarning(false);
    setShowBackupPhrase(true);
  };

  const generateNewKey = () => {
    console.log("Generate New Encryption Key");
    console.log("Clear Existing Backup Data");
    const words = [
      "mango",
      "noble",
      "ocean",
      "prime",
      "quest",
      "royal",
      "solar",
      "titan",
      "ultra",
      "vivid",
      "world",
      "xenon",
    ];
    const key = words.join(" ");
    setState((prev) => ({
      ...prev,
      encryptionKey: key,
      backupPhrase: words,
      photosCount: 0,
    }));
    setShowNewKeyWarning(false);
  };

  const addDevice = () => {
    console.log("Show QR code or key import");
  };

  const changeSource = (source: "photos-app" | "files-app") => {
    console.log("TODO: Update backup source preference:", source);
    setState((prev) => ({ ...prev, photoSource: source }));
    setShowSourceSelector(false);
  };

  const changePlan = (plan: "free" | "backup-plus") => {
    console.log("TODO: Show plan selection modal", plan);
    setState((prev) => ({ ...prev, selectedPlan: plan }));
    setShowPlanSelector(false);
  };

  if (showDevices) {
    return (
      <DevicesView
        devices={state.devices}
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
              enabled={state.autoBackupEnabled}
              onToggle={toggleAutoBackup}
            />
            <div className="h-[0.5px] bg-[#E5E5EA] ml-4" />
            <SettingsToggleRow
              label="Hintergrund-Backup"
              description="Weiter sichern wenn App geschlossen"
              enabled={state.backgroundBackupEnabled}
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
                  {state.selectedPlan === "free" ? "Free" : "Backup+"}
                </span>
              </div>
              <p className="text-[13px] text-[#6E6E73]">
                {state.selectedPlan === "free"
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
                {state.selectedPlan === "free"
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
                  {state.devices.length}
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

        {/* Onboarding Section */}
        <div className="mb-6">
          <h2 className="text-[13px] font-semibold text-[#6E6E73] uppercase tracking-wide px-4 mb-2">
            Setup
          </h2>
          <div className="bg-white rounded-xl overflow-hidden">
            <button
              onClick={() => {
                console.log("TODO: Navigate to onboarding screen 1");
                onRestartOnboarding();
              }}
              className="w-full flex items-center justify-between p-4 ios-tap-target"
            >
              <div className="flex items-center gap-3">
                <CustomIcon name="refresh" size={24} />
                <span className="text-[17px] text-[#1D1D1F]">
                  Onboarding wiederholen
                </span>
              </div>
              <CustomIcon name="chevronRight" size={16} />
            </button>
          </div>
          <p className="text-[13px] text-[#6E6E73] px-4 mt-2">
            Schlüssel, Quelle und Plan neu einrichten
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

            {/* 12 words in grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(state.backupPhrase.length > 0
                ? state.backupPhrase
                : dummyBackupPhrase
              ).map((word, index) => (
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
          onConfirm={generateNewKey}
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
          currentPlan={state.selectedPlan}
          onSelect={changePlan}
          onClose={() => setShowPlanSelector(false)}
        />
      )}
    </div>
  );
}

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
