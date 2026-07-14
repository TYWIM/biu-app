import { Capacitor } from "@capacitor/core";

import { VideoFnval, VideoQuality } from "@/common/constants/video";
import log from "@/common/utils/logger";
import { getPlayerPlayurl } from "@/service/player-playurl";
import { getWebInterfaceView } from "@/service/web-interface-view";

import { getAudioUrl, getDashUrl } from "./audio";
import { isCapacitorNative } from "./runtime-platform";

export interface DownloadTask {
  outputFileType: "audio" | "video";
  title: string;
  cover?: string;
  bvid?: string;
  cid?: number | string;
  sid?: number | string;
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

const createDownloadFileName = (task: DownloadTask) => {
  const extension = task.outputFileType === "video" ? "mp4" : "m4a";
  const identity = task.sid
    ? `audio-${task.sid}`
    : task.bvid
      ? `${task.bvid}${task.cid ? `-${task.cid}` : ""}`
      : task.outputFileType;
  const safeTitle = task.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, "_").replace(/^_+|_+$/g, "");

  return `${identity}-${safeTitle || "media"}-${Date.now()}.${extension}`;
};

export async function resolveDownloadUrl(task: DownloadTask): Promise<string> {
  if (task.url) {
    return task.url;
  }

  if (task.outputFileType === "audio" && task.sid) {
    const audio = await getAudioUrl(task.sid);
    if (audio.audioUrl) {
      return audio.audioUrl;
    }
  }

  if (!task.bvid) {
    throw new Error("缺少可下载的媒体标识");
  }

  let cid = task.cid;
  if (!cid) {
    const view = await getWebInterfaceView({ bvid: task.bvid });
    cid = view?.data?.pages?.[0]?.cid;
  }

  if (!cid) {
    throw new Error("无法获取视频分P信息");
  }

  if (task.outputFileType === "audio") {
    const stream = await getDashUrl(task.bvid, cid);
    if (stream.audioUrl) {
      return stream.audioUrl;
    }
    throw new Error("无法获取音频下载地址");
  }

  const stream = await getPlayerPlayurl({
    bvid: task.bvid,
    cid,
    qn: VideoQuality.Q1080P,
    fnval: VideoFnval.MP4,
    fnver: 0,
    fourk: 0,
    platform: "html5",
    high_quality: 1,
  });
  const segments = stream?.data?.durl ?? [];

  if (segments.length !== 1 || !segments[0]?.url) {
    throw new Error(segments.length > 1 ? "暂不支持分段视频下载" : "无法获取视频下载地址");
  }

  return segments[0].url;
}

export async function addDownloadTask(task: DownloadTask): Promise<{ downloadId: number; status: string } | null> {
  if (!isCapacitorNative() || Capacitor.getPlatform() !== "android") {
    log.warn("[download] Download is only supported on Android native");
    return null;
  }

  try {
    const url = await resolveDownloadUrl(task);
    const { BiuDownload } = await import("@/native/biu-download");
    const result = await BiuDownload.download({
      url,
      title: task.title,
      fileName: createDownloadFileName(task),
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
    return (result.list || []) as DownloadProgress[];
  } catch (error) {
    log.error("[download] Failed to get download list:", error);
    return [];
  }
}

export async function getDownloadedFiles(outputFileType: "audio" | "video" = "audio"): Promise<
  Array<{
    fileName: string;
    filePath: string;
    size: number;
    lastModified: number;
  }>
> {
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
