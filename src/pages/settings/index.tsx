import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { App as CapApp } from "@capacitor/app";
import { Tab, Tabs } from "@heroui/react";
import { useShallow } from "zustand/react/shallow";

import useIsMobile from "@/common/hooks/use-is-mobile";
import ScrollContainer from "@/components/scroll-container";
import { useAppUpdateStore } from "@/store/app-update";
import { useSettings } from "@/store/settings";

import MenuSettings from "./menu-settings";
import { SystemSettingsTab } from "./system-settings";

const useSystemSettingsForm = () => {
  const [appVersion, setAppVersion] = useState<string>("");
  const {
    fontFamily,
    primaryColor,
    backgroundColor,
    borderRadius,
    audioQuality,
    followSystemVolume,
    hiddenMenuKeys,
    displayMode,
    themeMode,
    pageTransition,
    showSearchHistory,
    reportPlayHistory,
  } = useSettings(
    useShallow(s => ({
      fontFamily: s.fontFamily,
      primaryColor: s.primaryColor,
      backgroundColor: s.backgroundColor,
      borderRadius: s.borderRadius,
      audioQuality: s.audioQuality,
      followSystemVolume: s.followSystemVolume,
      hiddenMenuKeys: s.hiddenMenuKeys,
      displayMode: s.displayMode,
      themeMode: s.themeMode,
      pageTransition: s.pageTransition,
      showSearchHistory: s.showSearchHistory,
      reportPlayHistory: s.reportPlayHistory,
    })),
  );
  const updateSettings = useSettings(s => s.update);
  const { isUpdateAvailable, latestVersion } = useAppUpdateStore(
    useShallow(s => ({
      isUpdateAvailable: s.isUpdateAvailable ?? false,
      latestVersion: s.latestVersion,
    })),
  );

  const { control, watch } = useForm<AppSettings>({
    defaultValues: {
      fontFamily,
      primaryColor,
      backgroundColor,
      borderRadius,
      audioQuality,
      followSystemVolume,
      hiddenMenuKeys,
      displayMode,
      themeMode,
      pageTransition,
      showSearchHistory,
      reportPlayHistory,
    },
  });

  useEffect(() => {
    const subscription = watch((values, { name }) => {
      if (!name) return;
      const patch = { [name]: (values as any)[name] } as Partial<AppSettings>;
      updateSettings(patch);
    });
    return () => subscription.unsubscribe();
  }, [watch, updateSettings]);

  useEffect(() => {
    CapApp.getInfo()
      .then(info => setAppVersion(info.version))
      .catch(() => {});
  }, []);

  return {
    appVersion,
    audioQuality,
    control,
    isUpdateAvailable,
    latestVersion,
  };
};

const SettingsPage = () => {
  const system = useSystemSettingsForm();
  const isMobile = useIsMobile();

  return (
    <ScrollContainer enableBackToTop className="h-full w-full">
      <div className={isMobile ? "m-auto mb-6 max-w-[900px] px-4 py-3" : "m-auto mb-6 max-w-[900px] px-8 py-4"}>
        <div className={isMobile ? "space-y-4" : "space-y-6"}>
          {!isMobile ? <h1>设置</h1> : null}
          <Tabs
            aria-label="设置选项"
            size="md"
            className="w-full"
            classNames={{
              panel: isMobile ? "px-0 py-0" : "px-1 py-0",
              cursor: "rounded-medium",
              tabList: "max-w-full overflow-x-auto no-scrollbar",
              tab: isMobile ? "h-11 px-4" : undefined,
            }}
          >
            <Tab key="system" title="常规设置">
              <SystemSettingsTab {...system} />
            </Tab>
            <Tab key="menu" title="菜单设置">
              <MenuSettings control={system.control} />
            </Tab>
          </Tabs>
        </div>
      </div>
    </ScrollContainer>
  );
};

export default SettingsPage;
