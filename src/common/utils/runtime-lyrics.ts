import axios from "axios";

import { nativeHttpAdapter, shouldUseNativeHttp } from "./native-http-adapter";

const NETEASE_REFERER = "https://music.163.com/";
const NETEASE_ORIGIN = "https://music.163.com";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const useNativeHttp = shouldUseNativeHttp();

const neteaseRequest = axios.create({
  timeout: 10000,
  headers: {
    Referer: NETEASE_REFERER,
    origin: NETEASE_ORIGIN,
    "User-Agent": USER_AGENT,
  },
  ...(useNativeHttp ? { adapter: nativeHttpAdapter as any } : {}),
});

const lrclibRequest = axios.create({
  timeout: 10000,
  ...(useNativeHttp ? { adapter: nativeHttpAdapter as any } : {}),
});

neteaseRequest.interceptors.response.use(res => res.data);
lrclibRequest.interceptors.response.use(res => res.data);

const getElectronLyricsApi = () => {
  if (typeof window === "undefined") {
    return undefined;
  }

  return (window as Window & { electron?: Partial<ElectronAPI> }).electron;
};

export const canSearchNeteaseLyrics = () => Boolean(getElectronLyricsApi()?.searchNeteaseSongs) || useNativeHttp;

export const canGetNeteaseLyrics = () => Boolean(getElectronLyricsApi()?.getNeteaseLyrics) || useNativeHttp;

export const canSearchLrclibLyrics = () => Boolean(getElectronLyricsApi()?.searchLrclibLyrics) || useNativeHttp;

export const searchNeteaseSongsRuntime = async (params: SearchSongByNeteaseParams) => {
  const electron = getElectronLyricsApi();
  if (electron?.searchNeteaseSongs) {
    return electron.searchNeteaseSongs(params);
  }

  const response = await neteaseRequest.get("https://interface.music.163.com/api/search/get", {
    params,
  });
  return response as SearchSongByNeteaseResponse;
};

export const getNeteaseLyricsRuntime = async (params: GetLyricsByNeteaseParams) => {
  const electron = getElectronLyricsApi();
  if (electron?.getNeteaseLyrics) {
    return electron.getNeteaseLyrics(params);
  }

  const response = await neteaseRequest.get("https://interface.music.163.com/api/song/lyric", {
    params: {
      ...params,
      tv: -1,
      lv: -1,
      rv: -1,
      kv: -1,
      _nmclfl: 1,
    },
  });
  return response as GetLyricsByNeteaseResponse;
};

export const searchLrclibLyricsRuntime = async (params: SearchSongByLrclibParams) => {
  const electron = getElectronLyricsApi();
  if (electron?.searchLrclibLyrics) {
    return electron.searchLrclibLyrics(params);
  }

  const response = await lrclibRequest.get("https://lrclib.net/api/search", {
    params,
  });
  return response as SearchSongByLrclibResponse[];
};
