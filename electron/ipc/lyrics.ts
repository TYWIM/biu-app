import { ipcMain } from "electron";

import { getLyricsByLrclib } from "./api/lrclib-lyric";
import { getLyricsByNetease, getSongByNetease } from "./api/netease-lyric";
import { channel } from "./channel";

export function registerLyricsHandlers() {
  ipcMain.handle(channel.lyrics.searchNeteaseSongs, async (_, params: SearchSongByNeteaseParams) => {
    return getSongByNetease(params);
  });

  ipcMain.handle(channel.lyrics.getNeteaseLyrics, async (_, params: GetLyricsByNeteaseParams) => {
    return getLyricsByNetease(params);
  });

  ipcMain.handle(channel.lyrics.searchLrclib, async (_, params: SearchSongByLrclibParams) => {
    return getLyricsByLrclib(params);
  });
}
