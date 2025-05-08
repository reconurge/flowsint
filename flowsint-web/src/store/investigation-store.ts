import { create } from "zustand";

interface InvestigationState {
    openUploadModal: boolean;
    setOpenUploadModal: (isOpen: boolean) => void;
}

export const useInvestigationStore = create<InvestigationState>((set) => ({
    openUploadModal: false,
    setOpenUploadModal: (isOpen) => set({ openUploadModal: isOpen }),
}));
