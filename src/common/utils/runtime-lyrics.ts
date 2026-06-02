import axios from "axios";

import { nativeHttpAdapter, shouldUseNativeHttp } from "./native-http-adapter";

const NETEASE_REFERER = "https://music.163.com/";
const NETEASE_ORIGIN = "https://music.163.com";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const useNativeHttp = shouldUseNativeHttp();

const neteaseRequest = axios.create({
  timeout: 15000,
  headers: {
    Referer: NETEASE_REFERER,
    origin: NETEASE_ORIGIN,
    "User-Agent": USER_AGENT,
  },
  ...(useNativeHttp ? { adapter: nativeHttpAdapter as any } : {}),
});

const lrclibRequest = axios.create({
  timeout: 15000,
  ...(useNativeHttp ? { adapter: nativeHttpAdapter as any } : {}),
});

// 响应拦截器：处理网易云 API 特殊状态码
neteaseRequest.interceptors.response.use(
  res => res.data,
  error => {
    // 网易云 API 有时会返回 200 但 code 不为 0，这里统一处理
    if (error.response?.data?.code === -460) {
      return Promise.reject(new Error("请求过于频繁，请稍后再试"));
    }
    if (error.response?.data?.code === -463) {
      return Promise.reject(new Error("IP 受限，请稍后再试"));
    }
    return Promise.reject(error);
  },
);

lrclibRequest.interceptors.response.use(res => res.data);


export const canSearchNeteaseLyrics = () => useNativeHttp;

export const canGetNeteaseLyrics = () => useNativeHttp;

export const canSearchLrclibLyrics = () => useNativeHttp;

export const searchNeteaseSongsRuntime = async (params: SearchSongByNeteaseParams) => {
    const response = await neteaseRequest.get("https://interface.music.163.com/api/search/get", {
    params,
  });
  return response as SearchSongByNeteaseResponse;
};

export const getNeteaseLyricsRuntime = async (params: GetLyricsByNeteaseParams) => {
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
    const response = await lrclibRequest.get("https://lrclib.net/api/search", {
    params,
  });
  return response as SearchSongByLrclibResponse[];
};
