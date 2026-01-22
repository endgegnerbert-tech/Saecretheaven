import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface SettingsState {
    backupActive: boolean;
    autoBackupEnabled: boolean;
    backgroundBackupEnabled: boolean;
    selectedPlan: 'free' | 'backup-plus';
    setBackupActive: (active: boolean) => void;
    setAutoBackupEnabled: (enabled: boolean) => void;
    setBackgroundBackupEnabled: (enabled: boolean) => void;
    setSelectedPlan: (plan: 'free' | 'backup-plus') => void;
}

const dummyStorage = {
    getItem: () => null,
    setItem: () => { },
    removeItem: () => { },
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            backupActive: false,
            autoBackupEnabled: true,
            backgroundBackupEnabled: false,
            selectedPlan: 'free',

            setBackupActive: (active) => set({ backupActive: active }),
            setAutoBackupEnabled: (enabled) => set({ autoBackupEnabled: enabled }),
            setBackgroundBackupEnabled: (enabled) => set({ backgroundBackupEnabled: enabled }),
            setSelectedPlan: (plan) => set({ selectedPlan: plan }),
        }),
        {
            name: 'photovault-settings',
            storage: createJSONStorage(() => typeof window !== 'undefined' ? localStorage : dummyStorage),
            skipHydration: true,
        }
    )
);
