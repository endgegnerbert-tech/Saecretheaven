"use client";

import { useState, useEffect } from "react";
import { OnboardingFlow } from "./OnboardingFlow";
import { Dashboard } from "./Dashboard";
import { SettingsPanel } from "./SettingsPanel";
import { PhotoGallery } from "./PhotoGallery";
import { Settings } from "lucide-react";
import { CustomIcon } from "@/components/ui/custom-icon";
import ShieldLoader from "@/components/ui/shield-loader";

export interface AppState {
  isOnboarded: boolean;
  backupActive: boolean;
  selectedPlan: "free" | "backup-plus";
  autoBackupEnabled: boolean;
  backgroundBackupEnabled: boolean;
  photosCount: number;
  lastBackup: string;
  permanence: number;
  encryptionKey: string;
  backupPhrase: string[];
  devices: {
    id: string;
    name: string;
    lastActive: string;
    syncing?: boolean;
  }[];
  photoSource: "photos-app" | "files-app";
}

export const dummyBackupPhrase = [
  "beach",
  "ocean",
  "sunset",
  "cloud",
  "tree",
  "river",
  "mountain",
  "forest",
  "valley",
  "lake",
  "meadow",
  "canyon",
];

const defaultState: AppState = {
  isOnboarded: false,
  backupActive: false,
  selectedPlan: "free",
  autoBackupEnabled: true,
  backgroundBackupEnabled: false,
  photosCount: 2847,
  lastBackup: "vor 2 Stunden",
  permanence: 99.9,
  encryptionKey: "",
  backupPhrase: dummyBackupPhrase,
  devices: [
    { id: "1", name: "iPhone 14 Pro", lastActive: "Aktiv" },
    {
      id: "2",
      name: "MacBook Pro",
      lastActive: "Synchronisiert...",
      syncing: true,
    },
  ],
  photoSource: "photos-app",
};

export type Screen = "onboarding" | "gallery" | "dashboard" | "settings";

export function PhotoVaultApp() {
  const [state, setState] = useState<AppState>(defaultState);
  const [currentScreen, setCurrentScreen] = useState<Screen>("onboarding");
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user has been onboarded
  useEffect(() => {
    // Simulate loading time for demo purposes
    const loadingTimer = setTimeout(() => {
      const onboarded = localStorage.getItem("photovault_onboarded");
      if (onboarded === "true") {
        setState((prev) => ({ ...prev, isOnboarded: true }));
        setCurrentScreen("gallery");
      }
      setIsLoading(false);
    }, 2000); // Show loader for 2 seconds

    return () => clearTimeout(loadingTimer);
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem("photovault_onboarded", "true");
    setState((prev) => ({ ...prev, isOnboarded: true }));
    setCurrentScreen("gallery");
    console.log("Onboarding completed with state:", state);
  };

  const restartOnboarding = () => {
    console.log("TODO: Navigate to onboarding screen 1");
    localStorage.removeItem("photovault_onboarded");
    setState((prev) => ({ ...prev, isOnboarded: false }));
    setOnboardingStep(1);
    setCurrentScreen("onboarding");
  };

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  // Show loading screen
  if (isLoading) {
    return <ShieldLoader />;
  }

  // Show onboarding without bottom nav
  if (currentScreen === "onboarding") {
    return (
      <div className="min-h-screen ios-bg-gray">
        <div className="max-w-[428px] mx-auto min-h-screen bg-[#F2F2F7]">
          <OnboardingFlow
            state={state}
            setState={setState}
            step={onboardingStep}
            setStep={setOnboardingStep}
            onComplete={completeOnboarding}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ios-bg-gray">
      <div className="max-w-[428px] mx-auto min-h-screen bg-[#F2F2F7] flex flex-col">
        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden pb-[80px]">
          {currentScreen === "gallery" && (
            <PhotoGallery photosCount={state.photosCount} />
          )}
          {currentScreen === "dashboard" && (
            <Dashboard state={state} setState={setState} />
          )}
          {currentScreen === "settings" && (
            <SettingsPanel
              state={state}
              setState={setState}
              onRestartOnboarding={restartOnboarding}
            />
          )}
        </div>

        {/* Bottom Navigation */}
        <BottomNavigation
          currentScreen={currentScreen}
          onNavigate={navigateTo}
        />
      </div>
    </div>
  );
}

function BottomNavigation({
  currentScreen,
  onNavigate,
}: {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[80px] bg-white border-t border-[#E5E5EA] flex items-start justify-around pt-2 pb-6 max-w-[428px] mx-auto">
      {/* Gallery Tab */}
      <button
        onClick={() => onNavigate("gallery")}
        className="flex flex-col items-center gap-1 ios-tap-target px-4"
      >
        <CustomIcon name="image" size={24} />
        <span
          className={`text-[10px] ${currentScreen === "gallery" ? "text-[#007AFF]" : "text-[#6E6E73]"}`}
        >
          Galerie
        </span>
      </button>

      {/* Backup Tab */}
      <button
        onClick={() => onNavigate("dashboard")}
        className="flex flex-col items-center gap-1 ios-tap-target px-4"
      >
        <CustomIcon name="shield" size={24} />
        <span
          className={`text-[10px] ${currentScreen === "dashboard" ? "text-[#007AFF]" : "text-[#6E6E73]"}`}
        >
          Backup
        </span>
      </button>

      {/* Settings Tab */}
      <button
        onClick={() => onNavigate("settings")}
        className="flex flex-col items-center gap-1 ios-tap-target px-4"
      >
        <Settings
          className={`w-6 h-6 ${currentScreen === "settings" ? "text-[#007AFF]" : "text-[#6E6E73]"}`}
        />
        <span
          className={`text-[10px] ${currentScreen === "settings" ? "text-[#007AFF]" : "text-[#6E6E73]"}`}
        >
          Einstellungen
        </span>
      </button>
    </nav>
  );
}
