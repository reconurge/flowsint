import { create } from "zustand";

interface ProjectState {
    openUploadModal: boolean;
    setOpenUploadModal: (isOpen: boolean) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
    openUploadModal: false,
    setOpenUploadModal: (isOpen) => set({ openUploadModal: isOpen }),
}));
