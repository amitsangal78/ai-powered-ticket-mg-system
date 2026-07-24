import { create } from 'zustand';

type UiState = {
  bannerError: string | null;
  setBannerError: (message: string | null) => void;
};

export const useUiStore = create<UiState>((set) => ({
  bannerError: null,
  setBannerError: (message) => set({ bannerError: message }),
}));
