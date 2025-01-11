import { create } from "zustand";

const textures = ["/global/images/texture/1.jpeg", "/global/images/texture/2.jpeg", "/global/images/texture/3.jpeg"];

interface AnimationStore {
  index: number;
  texture: string;
  setIndex: (num: number) => void;
}

export const useAnimation = create<AnimationStore>((set) => ({
  index: 0,
  texture: textures[1],
  setIndex: (num: number) => set({ index: num, texture: textures[num] }),
}));