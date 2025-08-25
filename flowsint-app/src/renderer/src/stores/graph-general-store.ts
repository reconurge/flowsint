import { type Settings } from '@/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DEFAULT_SETTINGS = {
    prefferedNodesView: {
        value: "force",
        options: ["table", "hierarchy", "force", "relationships"],
        description: "Preferred display for the entities."
    }
}

type GraphGeneralSettingsStore = {
    // Settings state
    settings: Settings
    updateSetting: (key: string, val: any) => void
    // UI State
    settingsModalOpen: boolean
    setSettingsModalOpen: (open: boolean) => void
    keyboardShortcutsOpen: boolean
    setKeyboardShortcutsOpen: (open: boolean) => void
};

export const useGraphGeneralSettingsStore = create<GraphGeneralSettingsStore>()(
    persist((set) => ({
        settingsModalOpen: false,
        setSettingsModalOpen: (open) => set({ settingsModalOpen: open }),
        keyboardShortcutsOpen: false,
        setKeyboardShortcutsOpen: (open) => set({ keyboardShortcutsOpen: open }),
        settings: DEFAULT_SETTINGS,
        updateSetting: (key, val) => set((state) => ({
            settings: {
                ...state.settings,
                [key]: {
                    ...state.settings[key],
                    value: val
                },
            },
        })),
    }),
        {
            name: 'graph-general-storage',
            partialize: (state) => ({
                settings: state.settings,
            }),
        }
    ));
