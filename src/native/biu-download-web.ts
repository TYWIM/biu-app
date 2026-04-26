import type { BiuDownloadPlugin } from "./biu-download";

export class BiuDownloadWeb implements BiuDownloadPlugin {
  async download(): Promise<{ downloadId: number; status: string }> {
    throw new Error("Download is not supported in browser");
  }

  async cancelDownload(): Promise<void> {
    throw new Error("Download is not supported in browser");
  }

  async getDownloadList(): Promise<{ list: never[] }> {
    return { list: [] };
  }

  async getDownloadProgress(): Promise<never> {
    throw new Error("Download is not supported in browser");
  }

  async deleteDownload(): Promise<{ success: boolean }> {
    return { success: false };
  }

  async getDownloadedFiles(): Promise<{ list: never[] }> {
    return { list: [] };
  }

  async addListener(): Promise<{ remove: () => void }> {
    return { remove: () => {} };
  }
}
