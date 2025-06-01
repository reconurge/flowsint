import { create } from 'zustand'

interface ConsoleStore {
    isOpen: boolean
    toggleConsole: () => void
    openConsole: () => void
    closeConsole: () => void
}

export const useConsoleStore = create<ConsoleStore>((set) => ({
    isOpen: false,
    toggleConsole: () => set((state) => ({ isOpen: !state.isOpen })),
    openConsole: () => set({ isOpen: true }),
    closeConsole: () => set({ isOpen: false }),
})) 