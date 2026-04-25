import { create } from "zustand";
import { persist } from "zustand/middleware";

const LEGACY_STORAGE_KEY = "play-current-time";
const STORAGE_KEY = "play-progress";

interface ProgressState {
  currentTime: number;
  setCurrentTime: (time: number) => void;
  initCurrentTime: () => number;
  saveCurrentTime: () => void;
  flushCurrentTime: () => void;
}

function migrateLegacyProgress(): number | undefined {
  try {
    const legacyValue = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyValue) {
      const time = Number(legacyValue);
      if (Number.isFinite(time) && time > 0) {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return time;
      }
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch {}
  return undefined;
}

const persistConfig = {
  name: STORAGE_KEY,
  partialize: (state: ProgressState) => ({ currentTime: state.currentTime }),
  onRehydrateStorage: () => (state: ProgressState | undefined) => {
    if (state && state.currentTime === 0) {
      const migrated = migrateLegacyProgress();
      if (migrated !== undefined) {
        state.currentTime = migrated;
      }
    }
  },
};

export const usePlayProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      currentTime: 0,
      initCurrentTime: () => {
        const time = get().currentTime;
        return time;
      },
      saveCurrentTime: () => {
      },
      flushCurrentTime: () => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { currentTime: get().currentTime }, version: 0 }));
        } catch {}
      },
      setCurrentTime: (time: number) => set({ currentTime: time }),
    }),
    persistConfig as any,
  ),
);