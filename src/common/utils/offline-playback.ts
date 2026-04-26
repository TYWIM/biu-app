import log from "@/common/utils/logger";

import { getCacheEntry, generateCacheKey } from "./cache-manager";
import { getDownloadedFiles } from "./native-download";

let isOfflineMode = false;

export function setOfflineMode(offline: boolean): void {
  isOfflineMode = offline;
  log.info(`[offline] Mode changed: ${offline ? "offline" : "online"}`);
}

export function getOfflineMode(): boolean {
  return isOfflineMode;
}

/**
 * Check if device is online
 */
export function isDeviceOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

/**
 * Get local file path for playback when offline
 */
export async function getOfflineAudioUrl(
  bvid?: string,
  cid?: number,
  sid?: number,
): Promise<string | null> {
  // Check cache metadata first
  const key = generateCacheKey("audio", bvid, cid, sid);
  const cacheEntry = await getCacheEntry(key);

  if (cacheEntry?.filePath) {
    return cacheEntry.filePath;
  }

  // Check downloaded files
  const downloadedFiles = await getDownloadedFiles("audio");
  const matchingFile = downloadedFiles.find(file => {
    if (sid) return file.fileName.includes(`audio-${sid}`);
    if (bvid && cid) return file.fileName.includes(bvid);
    return false;
  });

  return matchingFile?.filePath || null;
}

/**
 * Get offline video URL
 */
export async function getOfflineVideoUrl(
  bvid?: string,
  cid?: number,
): Promise<string | null> {
  const key = generateCacheKey("video", bvid, cid);
  const cacheEntry = await getCacheEntry(key);

  if (cacheEntry?.filePath) {
    return cacheEntry.filePath;
  }

  const downloadedFiles = await getDownloadedFiles("video");
  const matchingFile = downloadedFiles.find(file => {
    if (bvid && cid) return file.fileName.includes(bvid);
    return false;
  });

  return matchingFile?.filePath || null;
}

/**
 * Auto-detect offline mode and return appropriate URL
 */
export async function resolveAudioUrl(
  onlineUrl: string,
  bvid?: string,
  cid?: number,
  sid?: number,
): Promise<string> {
  if (!isDeviceOnline()) {
    const offlineUrl = await getOfflineAudioUrl(bvid, cid, sid);
    if (offlineUrl) {
      log.info(`[offline] Using cached audio: ${offlineUrl}`);
      return offlineUrl;
    }
  }
  return onlineUrl;
}

/**
 * Setup network state listeners
 */
export function setupNetworkListeners(
  onOffline?: () => void,
  onOnline?: () => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleOffline = () => {
    setOfflineMode(true);
    onOffline?.();
  };

  const handleOnline = () => {
    setOfflineMode(false);
    onOnline?.();
  };

  window.addEventListener("offline", handleOffline);
  window.addEventListener("online", handleOnline);

  // Initial check
  if (!navigator.onLine) {
    setOfflineMode(true);
  }

  return () => {
    window.removeEventListener("offline", handleOffline);
    window.removeEventListener("online", handleOnline);
  };
}
