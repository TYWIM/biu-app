import { create } from "zustand";
import { persist } from "zustand/middleware";

import { clearRuntimeStore, getRuntimeStore, setRuntimeStore } from "@/common/utils/runtime-store";
import { defaultShortcutSettings } from "@shared/settings/shortcut-settings";
import { StoreNameMap } from "@shared/store";

interface ShortcutActions {
  refresh: () => Promise<void>;
  update: (patch: Partial<ShortcutSettings>) => void;
  reset: () => void;
}

export const useShortcutSettings = create<ShortcutSettings & ShortcutActions>()(
  persist(
    set => ({
      ...defaultShortcutSettings,
      refresh: async () => {
        const store = await getRuntimeStore(StoreNameMap.ShortcutSettings);
        if (store) {
          set(store);
        }
      },
      update: (patch: Partial<ShortcutSettings>) => {
        set(patch);
      },
      reset: () => {
        set(defaultShortcutSettings);
      },
    }),
    {
      name: "shortcut-settings",
      storage: {
        getItem: async () => {
          const store = await getRuntimeStore(StoreNameMap.ShortcutSettings);

          return {
            state: store,
          };
        },

        setItem: async (_, value) => {
          if (value.state) {
            await setRuntimeStore(StoreNameMap.ShortcutSettings, value.state);
          }
        },

        removeItem: async () => {
          await clearRuntimeStore(StoreNameMap.ShortcutSettings);
        },
      },
      partialize: state => ({
        shortcuts: state.shortcuts,
        globalShortcuts: state.globalShortcuts,
        enableGlobalShortcuts: state.enableGlobalShortcuts,
      }),
    },
  ),
);
