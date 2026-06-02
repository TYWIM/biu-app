import type { StoreNameMap } from "../store";

declare global {
  type MediaDownloadsData = Record<string, any>;

  type StoreDataMap = {
    [StoreNameMap.AppSettings]: { appSettings: AppSettings };
    [StoreNameMap.UserLoginInfo]: UserInfo;
    [StoreNameMap.MediaDownloads]: MediaDownloadsData;
    [StoreNameMap.LyricsCache]: Record<string, MusicLyrics>;
    [StoreNameMap.PlaybackRate]: Record<string, number>;
  };
}

export {};
