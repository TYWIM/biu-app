import { Capacitor } from "@capacitor/core";

import log from "@/common/utils/logger";

import { isCapacitorNative } from "./native-player";

export interface DownloadTask {
  outputFileType: "audio" | "video";
  title: string;
  cover?: string;
  bvid?: string;
  cid?: number;
  sid?: number;
  url?: string;
}

export interface DownloadProgress {
  downloadId: number;
  title: string;
  outputFileType: string;
  fileName: string;
  status: "pending" | "downloading" | "paused" | "completed" | "failed";
  progress: number;
  localUri?: string;
  error?: string;
}

type DownloadProgressCallback = (progress: DownloadProgress) => void;
type DownloadCompleteCallback = (progress: DownloadProgress) => void;

let progressCallback: DownloadProgressCallback | null = null;
let completeCallback: DownloadCompleteCallback | null = null;

export function setDownloadProgressCallback(callback: DownloadProgressCallback | null) {
  progressCallback = callback;
}

export function setDownloadCompleteCallback(callback: DownloadCompleteCallback | null) {
  completeCallback = callback;
}

export async function addDownloadTask(task: DownloadTask): Promise<{ downloadId: number; status: string } | null> {
  if (!isCapacitorNative() || Capacitor.getPlatform() !== "android") {
    log.warn("[download] Download is only supported on Android native");
    return null;
  }

  try {
    const { BiuDownload } = await import("@/native/biu-download");
    const result = await BiuDownload.download({
      url: task.url || "",
      title: task.title,
      outputFileType: task.outputFileType,
      headers: {
        Referer: "https://www.bilibili.com",
        "User-Agent": navigator.userAgent,
      },
    });
    return result;
  } catch (error) {
    log.error("[download] Failed to add download task:", error);
    return null;
  }
}

export async function cancelDownload(downloadId: number): Promise<void> {
  if (!isCapacitorNative() || Capacitor.getPlatform() !== "android") {
    return;
  }

  try {
    const { BiuDownload } = await import("@/native/biu-download");
    await BiuDownload.cancelDownload({ downloadId });
  } catch (error) {
    log.error("[download] Failed to cancel download:", error);
  }
}

export async function getDownloadList(): Promise<DownloadProgress[]> {
  if (!isCapacitorNative() || Capacitor.getPlatform() !== "android") {
    return [];
  }

  try {
    const { BiuDownload } = await import("@/native/biu-download");
    const result = await BiuDownload.getDownloadList();
    return result.list || [];
  } catch (error) {
    log.error("[download] Failed to get download list:", error);
    return [];
  }
}

export async function getDownloadedFiles(outputFileType: "audio" | "video" = "audio"): Promise<Array<{
  fileName: string;
  filePath: string;
  size: number;
  lastModified: number;
}>> {
  if (!isCapacitorNative() || Capacitor.getPlatform() !== "android") {
    return [];
  }

  try {
    const { BiuDownload } = await import("@/native/biu-download");
    const result = await BiuDownload.getDownloadedFiles({ outputFileType });
    return result.list || [];
  } catch (error) {
    log.error("[download] Failed to get downloaded files:", error);
    return [];
  }
}

export async function deleteDownloadFile(filePath: string): Promise<boolean> {
  if (!isCapacitorNative() || Capacitor.getPlatform() !== "android") {
    return false;
  }

  try {
    const { BiuDownload } = await import("@/native/biu-download");
    const result = await BiuDownload.deleteDownload({ filePath });
    return result.success;
  } catch (error) {
    log.error("[download] Failed to delete download file:", error);
    return false;
  }
}
