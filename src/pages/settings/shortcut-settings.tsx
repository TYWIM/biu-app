import React from "react";

import { Checkbox, addToast } from "@heroui/react";
import { useShallow } from "zustand/react/shallow";

import useIsMobile from "@/common/hooks/use-is-mobile";
import { getUnsupportedFeatureMessage } from "@/common/utils/runtime-platform";
import AsyncButton from "@/components/async-button";
import ShortcutKeyInput from "@/components/shortcut-key-input";
import { useShortcutSettings } from "@/store/shortcuts";

const ShortcutSettingsPage = () => {
  const isMobile = useIsMobile();
  const electron = typeof window !== "undefined" ? window.electron : undefined;
  const registerShortcut = electron?.registerShortcut;
  const unregisterShortcut = electron?.unregisterShortcut;
  const registerAllShortcuts = electron?.registerAllShortcuts;
  const unregisterAllShortcuts = electron?.unregisterAllShortcuts;
  const canUseGlobalShortcuts =
    typeof registerShortcut === "function"
    && typeof unregisterShortcut === "function"
    && typeof registerAllShortcuts === "function"
    && typeof unregisterAllShortcuts === "function";
  const { shortcuts, globalShortcuts, enableGlobalShortcuts, refresh, update, reset } = useShortcutSettings(
    useShallow(state => ({
      shortcuts: state.shortcuts,
      globalShortcuts: state.globalShortcuts,
      enableGlobalShortcuts: state.enableGlobalShortcuts,
      refresh: state.refresh,
      update: state.update,
      reset: state.reset,
    })),
  );

  const handleChangeShortcut = (id: ShortcutCommand, shortcut: string) => {
    const updatedShortcuts = shortcuts.map(s => (s.id === id ? { ...s, shortcut } : s));

    const finalShortcuts = updatedShortcuts.map(s => {
      // 空快捷键不会冲突
      if (!s.shortcut) {
        return { ...s, isConflict: false, error: undefined };
      }
      const existing = updatedShortcuts.find(other => other.id !== s.id && other.shortcut === s.shortcut);
      return {
        ...s,
        isConflict: !!existing,
        error: existing ? `与“${existing.name}”冲突` : undefined,
      };
    });

    update({ shortcuts: finalShortcuts });
  };

  const handleChangeGlobalShortcut = async (id: ShortcutCommand, shortcut: string) => {
    if (!registerShortcut || !unregisterShortcut || !registerAllShortcuts || !unregisterAllShortcuts) {
      addToast({ title: getUnsupportedFeatureMessage("全局快捷键"), color: "default" });
      return;
    }

    if (shortcut) {
      const existing = globalShortcuts.find(g => g.id !== id && g.shortcut === shortcut);
      if (existing) {
        addToast({
          title: `与${existing.name}冲突`,
          color: "danger",
        });
        return;
      }

      const registerSuccess = await registerShortcut({
        id,
        accelerator: shortcut,
      });

      if (!registerSuccess) {
        addToast({
          title: "与系统或其他应用快捷键冲突",
          color: "danger",
        });
        return;
      }
    } else {
      await unregisterShortcut(id);
    }
    const newShortcuts = globalShortcuts.map(s =>
      s.id === id ? { ...s, shortcut, isConflict: false, error: undefined } : s,
    );
    update({ globalShortcuts: newShortcuts });
  };

  const handleToggleEnableGlobalShortcut = async (enabled: boolean) => {
    if (!registerAllShortcuts || !unregisterAllShortcuts) {
      addToast({ title: getUnsupportedFeatureMessage("全局快捷键"), color: "default" });
      return;
    }

    update({
      enableGlobalShortcuts: enabled,
    });

    if (enabled) {
      await registerAllShortcuts();
    } else {
      await unregisterAllShortcuts();
    }

    await refresh();
  };

  const handleReset = async () => {
    reset();
    if (!registerAllShortcuts) {
      addToast({ title: getUnsupportedFeatureMessage("全局快捷键"), color: "default" });
      return;
    }

    await registerAllShortcuts();
    await refresh();
  };

  return (
    <div className="space-y-6">
      <div className={isMobile ? "flex flex-col items-start gap-3" : "flex items-center justify-between"}>
        <h2>快捷键设置</h2>
        <AsyncButton size="sm" radius="md" variant="flat" onPress={handleReset}>
          恢复默认
        </AsyncButton>
      </div>

      {!isMobile && (
        <div className="grid grid-cols-[1fr_200px_200px] gap-4 text-sm font-medium text-zinc-500">
          <div>功能说明</div>
          <div>应用内快捷键</div>
          <div>全局快捷键</div>
        </div>
      )}

      <div className="space-y-4">
        {shortcuts.map(item => {
          const globalShortcut = globalShortcuts.find(g => g.id === item.id) as ShortcutItem;

          return (
            <div
              key={item.id}
              className={
                isMobile
                  ? "space-y-3 rounded-large border border-divider/40 p-4"
                  : "grid grid-cols-[1fr_200px_200px] items-start gap-4"
              }
            >
              <div className="text-medium">{item.name}</div>
              {isMobile ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="text-foreground-500 text-sm">应用内快捷键</div>
                    <ShortcutKeyInput
                      value={item.shortcut}
                      onChange={v => handleChangeShortcut(item.id, v)}
                      isInvalid={item.isConflict}
                      errorMessage={item.error}
                    />
                  </div>
                  {Boolean(globalShortcut) && (
                    <div className="space-y-1">
                      <div className="text-foreground-500 text-sm">全局快捷键</div>
                      <ShortcutKeyInput
                        value={globalShortcut.shortcut}
                        onChange={v => handleChangeGlobalShortcut(globalShortcut.id, v)}
                        isDisabled={!enableGlobalShortcuts || !canUseGlobalShortcuts}
                        isInvalid={globalShortcut.isConflict}
                        errorMessage="与系统或其他应用快捷键冲突"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <ShortcutKeyInput
                    value={item.shortcut}
                    onChange={v => handleChangeShortcut(item.id, v)}
                    isInvalid={item.isConflict}
                    errorMessage={item.error}
                  />
                  {Boolean(globalShortcut) && (
                    <ShortcutKeyInput
                      value={globalShortcut.shortcut}
                      onChange={v => handleChangeGlobalShortcut(globalShortcut.id, v)}
                      isDisabled={!enableGlobalShortcuts || !canUseGlobalShortcuts}
                      isInvalid={globalShortcut.isConflict}
                      errorMessage="与系统或其他应用快捷键冲突"
                    />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className={isMobile ? "text-start" : "text-end"}>
        <Checkbox
          color="primary"
          isSelected={enableGlobalShortcuts && canUseGlobalShortcuts}
          isDisabled={!canUseGlobalShortcuts}
          onValueChange={handleToggleEnableGlobalShortcut}
        >
          启用全局快捷键
        </Checkbox>
      </div>
    </div>
  );
};

export default ShortcutSettingsPage;
