import { useEffect } from "react";
import { useHref, useLocation, useNavigate, useRoutes } from "react-router";

import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { App as CapApp } from "@capacitor/app";
import dayjs from "dayjs";

import { getCookitFromBSite } from "./common/utils/cookie";
import Theme from "./components/theme";
import routes from "./routes";
import { useModalStore } from "./store/modal";
import { usePlayList } from "./store/play-list";
import { usePlayProgress } from "./store/play-progress";

import "dayjs/locale/zh-cn";

import "overlayscrollbars/overlayscrollbars.css";
import "./app.css";

dayjs.locale("zh-cn");

export function App() {
  const routeElement = useRoutes(routes);
  const location = useLocation();
  const navigate = useNavigate();
  const initPlayList = usePlayList(s => s.init);

  useEffect(() => {
    getCookitFromBSite();
  }, []);

  useEffect(() => {
    void initPlayList();
  }, [initPlayList]);

  useEffect(() => {
    const handleAndroidBack = () => {
      const modalStore = useModalStore.getState();

      if (modalStore.isConfirmModalOpen) {
        modalStore.onCloseConfirmModal();
        return;
      }

      if (modalStore.isPlayListDrawerOpen) {
        modalStore.closePlayListDrawer();
        return;
      }

      if (modalStore.isFullScreenPlayerOpen) {
        modalStore.closeFullScreenPlayer();
        return;
      }

      const canGoBack = (window.history?.state?.idx ?? 0) > 0;
      if (canGoBack) {
        navigate(-1);
        return;
      }

      if (location.pathname !== "/") {
        navigate("/");
      }
    };

    window.addEventListener("biuandroidbackbutton", handleAndroidBack);

    return () => {
      window.removeEventListener("biuandroidbackbutton", handleAndroidBack);
    };
  }, [location.pathname, navigate]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (usePlayProgress.getState().currentTime) {
        usePlayProgress.getState().flushCurrentTime();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    let capPauseListener: (() => void) | null = null;

    try {
      CapApp.addListener("appStateChange", (state) => {
        if (!state.isActive) {
          handleBeforeUnload();
        }
      }).then((listener) => {
        capPauseListener = () => listener.remove();
      }).catch(() => {});
    } catch {}

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      capPauseListener?.();
    };
  }, []);

  return (
    <HeroUIProvider navigate={navigate} useHref={useHref} locale="zh-CN">
      <ToastProvider
        placement="bottom-right"
        toastOffset={90}
        maxVisibleToasts={3}
        toastProps={{ timeout: 2000, color: "primary" }}
        regionProps={{
          classNames: {
            base: "z-[99999]",
          },
        }}
      />
      <Theme>{routeElement}</Theme>
    </HeroUIProvider>
  );
}
