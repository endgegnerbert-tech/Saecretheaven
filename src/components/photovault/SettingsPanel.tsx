"use client";



import { useState, useMemo } from "react";
import {
  Loader2,
  Cloud,
  Folder,
  AlertTriangle,
  Key,
  Smartphone,
  ChevronRight,
  RotateCcw,
  LogOut,
  MessageSquare,
  HelpCircle,
  Shield,
  X,
  Send,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import type { AppState } from "./PhotoVaultApp";
import { useEncryption } from "@/hooks/use-encryption";
import { getDevicesForUser } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/lib/storage/settings-store";
import { useGalleryData } from "@/hooks/use-gallery-data";
import { DevicePairing } from "@/components/features/settings/DevicePairing";

// Helper to format date
function formatDate(dateStr?: string): string {
  if (!dateStr) return "Unknown";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US");
}

function formatMemberSince(dateStr?: string): string {
  if (!dateStr) return "Recently joined";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

interface SettingsPanelProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onRestartOnboarding: () => void;
  authUser: { id: string; email: string; vaultKeyHash: string | null; createdAt?: string } | null;
}

export function SettingsPanel({ state: appState, setState: setAppState, onRestartOnboarding, authUser }: SettingsPanelProps) {
  const queryClient = useQueryClient();
  const { secretKey, recoveryPhrase, generateNewKey } = useEncryption();
  const {
    autoBackupEnabled,
    setAutoBackupEnabled,
    backgroundBackupEnabled,
    setBackgroundBackupEnabled,
    selectedPlan,
    setSelectedPlan,
    setLastBackup
  } = useSettingsStore();

  const { photoCount: realPhotoCount, isUploading } = useGalleryData(secretKey);

  const [showDevices, setShowDevices] = useState(false);
  const [showPhraseWarning, setShowPhraseWarning] = useState(false);
  const [showBackupPhrase, setShowBackupPhrase] = useState(false);
  const [showNewKeyWarning, setShowNewKeyWarning] = useState(false);
  const [showSourceSelector, setShowSourceSelector] = useState(false);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [showClearCacheWarning, setShowClearCacheWarning] = useState(false);
  const [showPairingFromSettings, setShowPairingFromSettings] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Fetch devices
  const { data: realDevices = [] } = useQuery({
    queryKey: ["devices", authUser?.vaultKeyHash],
    queryFn: () => authUser?.vaultKeyHash ? getDevicesForUser(authUser.vaultKeyHash) : Promise.resolve([]),
    enabled: !!authUser?.vaultKeyHash,
  });

  const toggleAutoBackup = () => setAutoBackupEnabled(!autoBackupEnabled);
  const toggleBackgroundBackup = () => setBackgroundBackupEnabled(!backgroundBackupEnabled);

  const triggerManualBackup = async () => {
    console.log("[Backup] Manual backup triggered");
    queryClient.invalidateQueries({ queryKey: ["photoCount"] });
    setLastBackup(new Date().toISOString());
  };

  const viewBackupPhrase = () => {
    setShowPhraseWarning(false);
    setShowBackupPhrase(true);
  };

  const handleGenerateNewKey = async () => {
    await generateNewKey();
    setShowNewKeyWarning(false);
    alert("New key generated. Please save your new recovery phrase.");
    setShowBackupPhrase(true);
  };

  const handleClearCache = async () => {
    const { db } = await import("@/lib/storage/local-db");
    await db.delete();
    localStorage.clear();
    window.location.reload();
  };

  const handleSignOut = async () => {
    try {
      const { db } = await import("@/lib/storage/local-db");
      await db.delete();
      localStorage.clear();
      await signOut();
      window.location.reload();
    } catch (e) {
      console.error("Sign out failed", e);
      window.location.reload();
    }
  };

  const changeSource = (source: "photos-app" | "files-app") => {
    console.log("[Source] Changed to", source);
    setShowSourceSelector(false);
  };

  const changePlan = (plan: "free" | "backup-plus") => {
    setSelectedPlan(plan);
    setShowPlanSelector(false);
  };

  const realBackupPhraseWords = recoveryPhrase ? recoveryPhrase.split(" ") : [];
  const userInitials = authUser?.email ? authUser.email.substring(0, 2).toUpperCase() : "?";

  const displayDevices = useMemo(() => {
    return realDevices.map(d => ({
      id: d.id || Math.random().toString(),
      name: d.device_name,
      lastActive: d.created_at ? formatDate(d.created_at) : "Unknown",
      syncing: false
    }));
  }, [realDevices]);

  if (showDevices) {
    return (
      <DevicesView
        devices={displayDevices}
        onBack={() => setShowDevices(false)}
        onAddDevice={() => setShowPairingFromSettings(true)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col pb-4 overflow-y-auto bg-gray-50/50">
      {/* Header */}
      <header className="px-5 pt-8 pb-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Settings</h1>
      </header>

      <div className="flex-1 px-4 space-y-5">
        {/* Account Section */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-1 mb-2">Account</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-lg shadow-md">
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-gray-900 truncate">
                  {authUser?.email || "Not signed in"}
                </p>
                <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Member since {formatMemberSince(authUser?.createdAt)}
                </p>
              </div>
            </div>
            <div className="h-px bg-gray-100 mx-4" />
            <button onClick={handleSignOut} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
              <LogOut className="w-5 h-5 text-gray-400" />
              <span className="text-base text-gray-700">Sign Out</span>
            </button>
          </div>
        </section>

        {/* Backup Section */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-1 mb-2">Backup</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-900">Auto Backup</p>
                <p className="text-sm text-gray-500">Back up new photos automatically</p>
              </div>
              <Switch checked={autoBackupEnabled} onCheckedChange={toggleAutoBackup} />
            </div>
            <div className="h-px bg-gray-100 mx-4" />
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-900">Background Backup</p>
                <p className="text-sm text-gray-500">Continue when app is closed</p>
              </div>
              <Switch checked={backgroundBackupEnabled} onCheckedChange={toggleBackgroundBackup} />
            </div>
            <div className="h-px bg-gray-100 mx-4" />
            <button onClick={() => setShowSourceSelector(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Folder className="w-5 h-5 text-blue-500" />
                <div className="text-left">
                  <span className="text-base font-medium text-gray-900 block">Backup Source</span>
                  <span className="text-sm text-gray-500">Photos App</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <Button onClick={triggerManualBackup} disabled={isUploading || !secretKey} className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11">
            {isUploading ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</>) : "Back Up Now"}
          </Button>
        </section>

        {/* Storage & Devices */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-1 mb-2">Storage & Devices</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button onClick={() => setShowPlanSelector(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Cloud className="w-5 h-5 text-blue-500" />
                <div className="text-left">
                  <span className="text-base font-medium text-gray-900 block">Storage Plan</span>
                  <span className="text-sm text-gray-500">{selectedPlan === "free" ? "Free" : "Backup+"} · {realPhotoCount} photos</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
            <div className="h-px bg-gray-100 mx-4" />
            <button onClick={() => setShowDevices(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-gray-600" />
                <span className="text-base font-medium text-gray-900">Connected Devices</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{realDevices.length || 1}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </button>
          </div>
        </section>

        {/* Security */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-1 mb-2">Security</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button onClick={() => setShowPhraseWarning(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-amber-500" />
                <span className="text-base font-medium text-gray-900">Recovery Phrase</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
            <div className="h-px bg-gray-100 mx-4" />
            <button onClick={() => setShowNewKeyWarning(true)} className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-red-500" />
                <span className="text-base font-medium text-red-600">Generate New Key</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <p className="text-xs text-gray-500 px-1 mt-2">Your recovery phrase is the only way to restore access.</p>
        </section>

        {/* Support */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-1 mb-2">Support</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button onClick={() => setShowFeedbackModal(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                <span className="text-base font-medium text-gray-900">Send Feedback</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
            <div className="h-px bg-gray-100 mx-4" />
            <a href="mailto:einar@black-knight.dev" className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-gray-500" />
                <span className="text-base font-medium text-gray-900">Get Help</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </a>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="pb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-red-500 px-1 mb-2">Danger Zone</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
            <button onClick={() => setShowClearCacheWarning(true)} className="w-full flex items-center justify-between p-4 hover:bg-orange-50 transition-colors">
              <div className="flex items-center gap-3">
                <RotateCcw className="w-5 h-5 text-orange-500" />
                <div className="text-left">
                  <span className="text-base font-medium text-orange-600 block">Clear Local Cache</span>
                  <span className="text-xs text-gray-500">Removes thumbnails, keeps cloud data</span>
                </div>
              </div>
            </button>
            <div className="h-px bg-red-100 mx-4" />
            <button
              onClick={async () => {
                if (confirm("WARNING: Delete your account?\n\nThis removes all local data. Cloud data becomes unusable without your key.")) {
                  try {
                    const { db } = await import("@/lib/storage/local-db");
                    await db.delete();
                    localStorage.clear();
                    await signOut();
                    window.location.reload();
                  } catch (e) {
                    alert("Error deleting account.");
                  }
                }
              }}
              className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div className="text-left">
                  <span className="text-base font-medium text-red-600 block">Delete Account</span>
                  <span className="text-xs text-gray-500">Permanently delete all data</span>
                </div>
              </div>
            </button>
          </div>
        </section>
      </div>

      {/* Modals */}
      {showPhraseWarning && (
        <Modal title="Security Warning" message="Your recovery phrase gives full access. Only view in a private place." confirmLabel="Show Phrase" confirmDestructive={false} onConfirm={viewBackupPhrase} onCancel={() => setShowPhraseWarning(false)} />
      )}

      {showBackupPhrase && <BackupPhraseModal words={realBackupPhraseWords} onClose={() => setShowBackupPhrase(false)} />}

      {showNewKeyWarning && (
        <Modal title="Data Loss Warning" message="Generating a new key will make existing backups unreadable." confirmLabel="Generate New Key" confirmDestructive={true} onConfirm={handleGenerateNewKey} onCancel={() => setShowNewKeyWarning(false)} />
      )}

      {showSourceSelector && <SourceSelectorModal currentSource={appState.photoSource} onSelect={changeSource} onClose={() => setShowSourceSelector(false)} />}

      {showPlanSelector && <PlanSelectorModal currentPlan={selectedPlan} onSelect={changePlan} onClose={() => setShowPlanSelector(false)} />}

      {showClearCacheWarning && (
        <Modal title="Clear Cache?" message="This removes local thumbnails. Your cloud photos remain safe." confirmLabel="Clear Cache" confirmDestructive={true} onConfirm={handleClearCache} onCancel={() => setShowClearCacheWarning(false)} />
      )}

      {showFeedbackModal && <FeedbackModal userEmail={authUser?.email} onClose={() => setShowFeedbackModal(false)} />}

      <DevicePairing isOpen={showPairingFromSettings} onClose={() => setShowPairingFromSettings(false)} />
    </div>
  );
}

function FeedbackModal({ userEmail, onClose }: { userEmail?: string; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { id: "general", label: "General" },
    { id: "bug", label: "Bug Report" },
    { id: "feature", label: "Feature Request" },
    { id: "other", label: "Other" },
  ];

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError("Please enter a message");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, message: message.trim(), category }),
      });
      if (!response.ok) throw new Error("Failed");
      setIsSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch {
      setError("Failed to send feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Send Feedback</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        {isSuccess ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-1">Thank You!</h4>
            <p className="text-gray-500">Your feedback has been sent.</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
              <div className="flex gap-2 flex-wrap">
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setCategory(cat.id)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${category === cat.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Your Feedback</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us what you think..." className="w-full h-32 px-3 py-2 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400" />
            </div>
            {error && <p className="text-sm text-red-600 flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{error}</p>}
            <Button onClick={handleSubmit} disabled={isSubmitting || !message.trim()} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-xl">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" />Send Feedback</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function BackupPhraseModal({ words, onClose }: { words: string[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
        <h3 className="text-xl font-bold text-center mb-1">Recovery Phrase</h3>
        <p className="text-sm text-gray-500 text-center mb-5">Write these down and store securely.</p>
        {words.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 mb-6">
            {words.map((word, i) => (
              <div key={i} className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-center">
                <span className="text-xs text-gray-400 block">{i + 1}</span>
                <span className="text-sm font-mono font-medium">{word}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6">
            <p className="text-sm text-amber-700 text-center font-medium">No recovery phrase found.</p>
          </div>
        )}
        <Button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-xl">Done</Button>
      </div>
    </div>
  );
}

function DevicesView({ devices, onBack, onAddDevice }: { devices: { id: string; name: string; lastActive: string; syncing?: boolean }[]; onBack: () => void; onAddDevice: () => void }) {
  return (
    <div className="h-full flex flex-col pb-4 overflow-y-auto bg-gray-50/50">
      <header className="px-5 pt-6 pb-4">
        <button onClick={onBack} className="text-blue-600 mb-2 flex items-center gap-1 text-sm font-medium">
          <ChevronRight className="w-4 h-4 rotate-180" />Back
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Devices</h1>
      </header>
      <div className="flex-1 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {devices.map((device, index) => (
            <div key={device.id}>
              {index > 0 && <div className="h-px bg-gray-100 mx-4" />}
              <div className="flex items-center gap-4 p-4">
                <Smartphone className="w-7 h-7 text-gray-400" />
                <div className="flex-1">
                  <p className="text-base font-medium text-gray-900">{device.name}</p>
                  <p className="text-sm text-gray-500">{device.lastActive}</p>
                </div>
                {device.syncing ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" /> : device.lastActive === "Just now" && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-medium text-green-600">Active</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <Button onClick={onAddDevice} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-xl">Connect New Device</Button>
        <p className="text-xs text-gray-500 text-center mt-3 px-4">Enter your recovery phrase on a new device to sync.</p>
      </div>
    </div>
  );
}

function SourceSelectorModal({ currentSource, onSelect, onClose }: { currentSource: "photos-app" | "files-app"; onSelect: (source: "photos-app" | "files-app") => void; onClose: () => void }) {
  const sources = [
    { id: "photos-app" as const, label: "Photos App", description: "All photos from your library" },
    { id: "files-app" as const, label: "Files App", description: "Photos from a specific folder" },
  ];
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-t-2xl p-5 pb-8">
        <h3 className="text-lg font-bold text-center mb-4">Backup Source</h3>
        <div className="space-y-2 mb-4">
          {sources.map((source) => (
            <button key={source.id} onClick={() => onSelect(source.id)} className={`w-full p-4 rounded-xl text-left transition-all ${currentSource === source.id ? "bg-blue-50 ring-2 ring-blue-500" : "bg-gray-50 hover:bg-gray-100"}`}>
              <p className="font-medium text-gray-900">{source.label}</p>
              <p className="text-sm text-gray-500">{source.description}</p>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="w-full py-3 text-blue-600 font-medium">Cancel</button>
      </div>
    </div>
  );
}

function PlanSelectorModal({ currentPlan, onSelect, onClose }: { currentPlan: "free" | "backup-plus"; onSelect: (plan: "free" | "backup-plus") => void; onClose: () => void }) {
  const plans = [
    { id: "free" as const, label: "Free", subtitle: "On your devices", price: "$0/month", features: ["Unlimited photos", "End-to-end encryption", "Multi-device sync"] },
    { id: "backup-plus" as const, label: "Backup+", subtitle: "Coming Soon", price: "$2.99/month", features: ["Everything in Free", "200 GB Cloud Storage", "Priority support"], disabled: true },
  ];
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-t-2xl p-5 pb-8 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-center mb-4">Storage Plan</h3>
        <div className="space-y-3 mb-4">
          {plans.map((plan) => (
            <button key={plan.id} onClick={() => !plan.disabled && onSelect(plan.id)} disabled={plan.disabled} className={`w-full p-4 rounded-xl text-left transition-all ${plan.disabled ? "bg-gray-50 opacity-60 cursor-not-allowed" : currentPlan === plan.id ? "bg-blue-50 ring-2 ring-blue-500" : "bg-gray-50 hover:bg-gray-100"}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{plan.label}</p>
                  <p className="text-sm text-gray-500">{plan.subtitle}</p>
                </div>
                <span className="font-semibold text-gray-900">{plan.price}</span>
              </div>
              <ul className="space-y-1">
                {plan.features.map((f) => <li key={f} className="text-sm text-gray-600 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" />{f}</li>)}
              </ul>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="w-full py-3 text-blue-600 font-medium">Cancel</button>
      </div>
    </div>
  );
}

function Modal({ title, message, confirmLabel, confirmDestructive, onConfirm, onCancel }: { title: string; message: string; confirmLabel: string; confirmDestructive: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
      <div className="bg-white w-full max-w-[280px] rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-5 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
        </div>
        <div className="border-t border-gray-200">
          <button onClick={onCancel} className="w-full py-3 text-blue-600 font-medium border-b border-gray-200">Cancel</button>
          <button onClick={onConfirm} className={`w-full py-3 font-semibold ${confirmDestructive ? "text-red-500" : "text-blue-600"}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
