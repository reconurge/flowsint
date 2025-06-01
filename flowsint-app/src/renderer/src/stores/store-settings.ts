import { create } from "zustand"

interface ModalState {
    isSettingsOpen: boolean
    openSettings: () => void
    closeSettings: () => void
    toggleSettings: () => void
}

export const useModalStore = create<ModalState>((set) => ({
    isSettingsOpen: false,
    openSettings: () => set({ isSettingsOpen: true }),
    closeSettings: () => set({ isSettingsOpen: false }),
    toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
}))
