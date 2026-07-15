import { registerPlugin } from "@capacitor/core";

export interface BiuDownloadPlugin {
  download(options: {
    url: string;
    title?: string;
    fileName?: string;
    outputFileType?: string;
    headers?: Record<string, string>;
  }): Promise<{ downloadId: number; status: string }>;

  cancelDownload(options: { downloadId: number }): Promise<void>;

  getDownloadList(): Promise<{
    list: Array<{
      downloadId: number;
      title: string;
      outputFileType: string;
      fileName: string;
      status: string;
      progress: number;
      localUri?: string;
      error?: string;
    }>;
  }>;

  getDownloadProgress(options: { downloadId: number }): Promise<{
    downloadId: number;
    title: string;
    outputFileType: string;
    fileName: string;
    status: string;
    progress: number;
    localUri?: string;
    error?: string;
  }>;

  deleteDownload(options: { filePath: string }): Promise<{ success: boolean }>;

  getDownloadedFiles(options: { outputFileType?: string }): Promise<{
    list: Array<{
      fileName: string;
      filePath: string;
      size: number;
      lastModified: number;
    }>;
  }>;

  addListener(
    eventName: "downloadProgress",
    listenerFunc: (progress: {
      downloadId: number;
      title: string;
      outputFileType: string;
      fileName: string;
      status: string;
      progress: number;
      localUri?: string;
      error?: string;
    }) => void,
  ): Promise<{ remove: () => void }>;

  addListener(
    eventName: "downloadComplete",
    listenerFunc: (progress: {
      downloadId: number;
      title: string;
      outputFileType: string;
      fileName: string;
      status: string;
      progress: number;
      localUri?: string;
      error?: string;
    }) => void,
  ): Promise<{ remove: () => void }>;
}

export const BiuDownload = registerPlugin<BiuDownloadPlugin>("BiuDownload", {
  web: () => import("@/native/biu-download-web").then(m => new m.BiuDownloadWeb()),
});
