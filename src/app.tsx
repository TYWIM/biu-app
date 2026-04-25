import { useEffect } from "react";
import { useHref, useLocation, useNavigate, useRoutes } from "react-router";

import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { App as CapApp } from "@capacitor/app";
import dayjs from "dayjs";

import { getCookitFromBSite } from "./common/utils/cookie";
import { toggleMiniMode } from "./common/utils/mini-player";
import { mapKeyToElectronAccelerator } from "./common/utils/shortcut";
import Theme from "./components/theme";
import routes from "./routes";
import { useAppUpdateStore } from "./store/app-update";
import { useModalStore } from "./store/modal";
import { usePlayList } from "./store/play-list";
import { usePlayProgress } from "./store/play-progress";
import { useShortcutSettings } from "./store/shortcuts";

import "dayjs/locale/zh-cn";

import "overlayscrollbars/overlayscrollbars.css";
import "./app.css";

dayjs.locale("zh-cn");

export function App() {
  const routeElement = useRoutes(routes);
  const location = useLocation();
  const navigate = useNavigate();
  const setUpdate = useAppUpdateStore(s => s.setUpdate);
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
    if (window.electron && window.electron.navigate) {
      const removeListener = window.electron.navigate(path => navigate(path));
      return removeListener;
    }
  }, [navigate]);

  // 订阅来自主进程的任务栏缩略按钮命令
  useEffect(() => {
    if (window.electron && window.electron.onPlayerCommand) {
      const removeListener = window.electron.onPlayerCommand(cmd => {
        const { prev, next, togglePlay } = usePlayList.getState();
        if (cmd === "prev") {
          prev();
        } else if (cmd === "next") {
          next();
        } else if (cmd === "toggle") {
          togglePlay();
        }
      });
      return removeListener;
    }
  }, []);

  // 订阅来自主进程的全局快捷键命令
  useEffect(() => {
    if (window.electron && window.electron.onShortcutCommand) {
      return window.electron.onShortcutCommand(cmd => {
        const { prev, next, togglePlay, setVolume, volume } = usePlayList.getState();

        switch (cmd) {
          case "togglePlay":
            togglePlay();
            break;
          case "prev":
            prev();
            break;
          case "next":
            next();
            break;
          case "volumeUp":
            setVolume(Math.min(1, volume + 0.05));
            break;
          case "volumeDown":
            setVolume(Math.max(0, volume - 0.05));
            break;
          case "toggleMiniMode":
            toggleMiniMode();
            break;
          default:
            break;
        }
      });
    }
  }, []);

  // 监听应用内快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略在输入框中的按键
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const shortcut = mapKeyToElectronAccelerator(e);
      if (!shortcut) return;

      const { shortcuts } = useShortcutSettings.getState();
      const matched = shortcuts.find(s => s.shortcut === shortcut);

      if (matched) {
        e.preventDefault();
        const { prev, next, togglePlay, setVolume, volume } = usePlayList.getState();
        switch (matched.id) {
          case "togglePlay":
            togglePlay();
            break;
          case "prev":
            prev();
            break;
          case "next":
            next();
            break;
          case "volumeUp":
            setVolume(Math.min(1, volume + 0.05));
            break;
          case "volumeDown":
            setVolume(Math.max(0, volume - 0.05));
            break;
          case "toggleMiniMode":
            toggleMiniMode();
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!window.electron?.onUpdateAvailable) {
      return;
    }

    const removeListener = window.electron.onUpdateAvailable(updateInfo => {
      setUpdate({
        isUpdateAvailable: true,
        latestVersion: updateInfo.latestVersion,
        releaseNotes: updateInfo.releaseNotes,
      });
    });

    return () => {
      removeListener();
    };
  }, []);

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
