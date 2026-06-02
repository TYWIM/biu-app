import { Capacitor } from "@capacitor/core";

/**
 * Check if media download is available on the current platform.
 * On mobile (Capacitor native), downloads are handled by the BiuDownload plugin.
 */
export const canDownloadMedia = (): boolean => {
  return Capacitor.isNativePlatform();
};
