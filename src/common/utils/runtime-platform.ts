import { Capacitor } from "@capacitor/core";

/**
 * 判断当前是否运行在 Electron 桌面环境
 */
export const isElectron = () => typeof window !== "undefined" && Boolean(window.electron);

/**
 * 判断当前是否运行在 Capacitor 原生壳（Android / iOS）
 */
export const isCapacitorNative = () => Capacitor.isNativePlatform();

/**
 * 判断当前是否运行在纯浏览器预览模式（既不是 Electron 也不是 Capacitor 原生壳）
 */
export const isBrowserPreview = () => !isElectron() && !isCapacitorNative();

const getNativeRuntimeLabel = () => {
  const platform = Capacitor.getPlatform();
  if (platform === "android") {
    return "Android 版本";
  }
  if (platform === "ios") {
    return "iOS 版本";
  }
  return "当前运行环境";
};

export const getUnsupportedFeatureMessage = (feature: string) => {
  if (isCapacitorNative()) {
    return `当前${getNativeRuntimeLabel()}暂不支持${feature}`;
  }
  if (isElectron()) {
    return `当前运行环境暂不支持${feature}`;
  }
  return `浏览器预览模式不支持${feature}`;
};
