import { create } from "zustand";
import { persist } from "zustand/middleware";

import { clearRuntimeStore, getRuntimeStore, setRuntimeStore } from "@/common/utils/runtime-store";
import { getUserInfo, type UserInfo } from "@/service/user-info";
import { StoreNameMap } from "@shared/store";

interface UserState {
  user: UserInfo | null;
}

interface Action {
  updateUser: () => Promise<void>;
  clear: () => void;
}
export const useUser = create<UserState & Action>()(
  persist(
    set => ({
      user: null,
      updateUser: async () => {
        const res = await getUserInfo();

        if (res.code === 0 && res.data?.isLogin) {
          set(() => ({ user: res.data }));
        } else {
          set(() => ({ user: null }));
        }
      },
      clear: () => {
        set(() => ({
          user: null,
        }));
      },
    }),
    {
      name: "user",
      partialize: state => state.user,
      storage: {
        getItem: async () => {
          const store = await getRuntimeStore(StoreNameMap.UserLoginInfo);

          return {
            state: store,
          };
        },

        setItem: async (_, value) => {
          if (value.state) {
            await setRuntimeStore(StoreNameMap.UserLoginInfo, value.state);
          }
        },

        removeItem: async () => {
          await clearRuntimeStore(StoreNameMap.UserLoginInfo);
        },
      },
    },
  ),
);
