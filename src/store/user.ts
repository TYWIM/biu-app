import { create } from "zustand";
import { persist } from "zustand/middleware";

import { saveCsrfToken, clearCsrfToken } from "@/common/utils/csrf-token";
import { getRuntimeCookie } from "@/common/utils/runtime-cookie";
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
          // Persist CSRF token when we know user is logged in
          const jct = await getRuntimeCookie("bili_jct");
          if (jct) saveCsrfToken(jct);
        } else {
          set(() => ({ user: null }));
          clearCsrfToken();
        }
      },
      clear: () => {
        set(() => ({
          user: null,
        }));
        clearCsrfToken();
      },
    }),
    {
      name: "user",
      partialize: state => state.user as any,
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
