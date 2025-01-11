import { create } from "zustand";

type UploadFileStore = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export const useUploadFile = create<UploadFileStore>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true, url: undefined }),
  onClose: () => set({ isOpen: false, url: undefined }),
}));


