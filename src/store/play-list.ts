import { addToast } from "@heroui/react";
import log from "@/common/utils/logger";
import { shuffle } from "es-toolkit/array";
import { remove } from "es-toolkit/array";
import { uniqueId } from "es-toolkit/compat";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { getPlayModeList, PlayMode } from "@/common/constants/audio";
import { getAudioUrl, getDashUrl, getUrlExpirySeconds, isUrlValid } from "@/common/utils/audio";
import {
  createPlaybackAudio,
  type PlaybackAudio,
  setNativePlayerRemoteCommandHandler,
  shouldUseNativePlayer,
  updateNativePlayerMetadata,
} from "@/common/utils/native-player";
import { beginPlayReport, bindDurationGetter, endPlayReport, reportHeartbeat } from "@/common/utils/play-report";
import { getRuntimeStore, setRuntimeStore } from "@/common/utils/runtime-store";
import { stripHtml } from "@/common/utils/str";
import { formatUrlProtocol } from "@/common/utils/url";
import { getAudioSongInfo } from "@/service/audio-song-info";
import { getWebInterfaceView } from "@/service/web-interface-view";
import { StoreNameMap } from "@shared/store";

import { usePlayProgress } from "./play-progress";
import { useSettings } from "./settings";

export type PlayDataType = "mv" | "audio";

export interface PlayData {
  id: string;
  /** 视频标题 */
  title: string;
  /** 类型 */
  type: PlayDataType;
  /** 视频id */
  bvid?: string;
  /** 音频id */
  sid?: number;
  /** 视频aid,部分视频操作需要，例如收藏 */
  aid?: string;
  /** 视频分集id */
  cid?: string;
  /** 视频封面 */
  cover?: string;
  /** UP name */
  ownerName?: string;
  /** up mid */
  ownerMid?: number;
  /** 是否为多集视频 */
  hasMultiPart?: boolean;
  /** 分集标题 */
  pageTitle?: string;
  /** 分集封面 */
  pageCover?: string;
  /** 分集id */
  pageIndex?: number;
  /** 视频总分集数 */
  totalPage?: number;
  /** 视频时长 单位为秒 */
  duration?: number;
  /** 视频音频url */
  audioUrl?: string;
  /** 视频url */
  videoUrl?: string;
  /** 是否为无损音频 */
  isLossless?: boolean;
  /** 是否为杜比音频 */
  isDolby?: boolean;
  /** 来源 */
  source?: "local" | "online";
}

interface State {
  // 播放/暂停
  isPlaying: boolean;
  // 静音
  isMuted: boolean;
  // 音量 0-1
  volume: number;
  // 播放模式
  playMode: PlayMode;
  // 播放速率（0.5x - 2.0x）
  rate: number;
  // 总时长（秒）
  duration: number | undefined;
  /** 播放队列 */
  list: PlayData[];
  /** 当前播放视频id */
  playId?: string;
  /** 下一个播放视频id */
  nextId?: string;
  /** 是否在随机播放模式下保持视频分集顺序 */
  shouldKeepPagesOrderInRandomPlayMode: boolean;
  /** 网络是否在线 */
  isOnline: boolean;
}

export interface PlayItem {
  type: PlayDataType;
  id?: string;
  source?: "local" | "online";
  audioUrl?: string;
  title: string;
  bvid?: string;
  sid?: number;
  cover?: string;
  ownerName?: string;
  ownerMid?: number;
}

interface Action {
  togglePlay: () => void;
  toggleMute: () => void;
  setVolume: (volume: number) => void; // 0-1
  syncVolumePreference: () => void;
  togglePlayMode: () => void;
  setRate: (rate: number) => void; // 0.5-2.0
  seek: (s: number) => void;
  setShouldKeepPagesOrderInRandomPlayMode: (shouldKeep: boolean) => void;

  init: VoidFunction;
  play: (params: PlayItem) => Promise<void>;
  playListItem: (id: string) => Promise<void>;
  playList: (items: PlayItem[]) => Promise<void>;
  addToNext: (item: PlayItem) => void;
  addList: (items: PlayItem[]) => void;
  delPage: (id: string) => void;
  del: (id: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  clear: () => void;
  next: () => Promise<void>;
  prev: () => Promise<void>;

  getAudio: () => PlaybackAudio;
  getPlayItem: () => PlayData | undefined;
}

const idGenerator = () => `${Date.now()}${uniqueId()}`;

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry<T> { data: T; expiry: number }

const mvDataCache = new Map<string, CacheEntry<PlayData[]>>();
const audioDataCache = new Map<number, CacheEntry<PlayData[]>>();

const getCached = <K, T>(cache: Map<K, CacheEntry<T>>, key: K): T | undefined => {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return undefined;
  }
  return entry.data;
};

const setCached = <K, T>(cache: Map<K, CacheEntry<T>>, key: K, data: T) => {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
};

const getMVData = async (bvid: string) => {
  const cached = getCached(mvDataCache, bvid);
  if (cached) return cached;

  const res = await getWebInterfaceView({ bvid });
  const hasMultiPart = (res?.data?.pages?.length ?? 0) > 1;

  const data =
    res?.data?.pages?.map(item => ({
      id: idGenerator(),
      type: "mv" as PlayDataType,
      bvid,
      aid: String(res?.data?.aid),
      cid: String(item.cid),
      title: res?.data?.title,
      cover: formatUrlProtocol(res?.data?.pic),
      ownerName: res?.data?.owner?.name,
      ownerMid: res?.data?.owner?.mid,
      hasMultiPart,

      pageIndex: item.page,
      pageTitle: hasMultiPart ? item.part : res?.data?.title,
      pageCover: hasMultiPart
        ? formatUrlProtocol(item.first_frame || res?.data?.pic)
        : formatUrlProtocol(res?.data?.pic),
      totalPage: res?.data?.pages?.length,
      duration: item.duration,
    })) || [];

  setCached(mvDataCache, bvid, data);
  return data;
};

const getAudioData = async (sid: number) => {
  const cached = getCached(audioDataCache, sid);
  if (cached) return cached;

  const res = await getAudioSongInfo({ sid });

  const data = [
    {
      id: idGenerator(),
      type: "audio" as PlayDataType,
      sid,
      title: res?.data?.title || "",
      cover: formatUrlProtocol(res?.data?.cover || ""),
      duration: res?.data?.duration || 0,
      ownerName: res?.data?.author || "",
      ownerMid: res?.data?.uid || 0,
    },
  ];

  setCached(audioDataCache, sid, data);
  return data;
};

const toastError = (title: string) => {
  addToast({
    title,
    color: "danger",
  });
};

const sanitizeTitle = (title: string) => stripHtml(title);

const handlePlayError = (error: any) => {
  const errorMsg = error?.message || error?.name || "";
  if (!errorMsg.includes("interrupted") && !errorMsg.includes("NotAllowed")) {
    toastError(error instanceof Error ? error.message : "获取播放链接失败");
  }
};

const clampVolume = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  return Math.max(0, Math.min(1, value));
};

const shouldFollowSystemVolume = () => shouldUseNativePlayer() && useSettings.getState().followSystemVolume;

const getRuntimeVolumeState = (state: Pick<State, "volume" | "isMuted">) => {
  if (shouldFollowSystemVolume()) {
    return {
      volume: 1,
      isMuted: false,
    };
  }

  return {
    volume: clampVolume(state.volume),
    isMuted: state.isMuted,
  };
};

const updateMediaSession = ({ title, artist, cover }: { title: string; artist?: string; cover?: string }) => {
  void updateNativePlayerMetadata({
    title,
    artist,
    cover,
  });

  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      artwork: cover ? [{ src: cover }] : [],
    });
  }
};

const createAudio = (): PlaybackAudio => createPlaybackAudio();

export const audio = createAudio();

// 每首歌的播放速度缓存
const getRateCacheKey = (item: PlayData | undefined): string | null => {
  if (!item) return null;
  if (item.source === "local" && item.id) {
    return `local-${item.id}`;
  }
  if (item.type === "mv" && item.bvid && item.cid) {
    return `mv-${item.bvid}-${item.cid}`;
  }
  if (item.type === "audio" && item.sid) {
    return `audio-${item.sid}`;
  }
  return null;
};

const getCachedRate = async (item: PlayData | undefined): Promise<number | null> => {
  const key = getRateCacheKey(item);
  if (!key) return null;
  try {
    const store = await getRuntimeStore(StoreNameMap.PlaybackRate);
    const rate = store?.[key];
    return typeof rate === "number" ? rate : null;
  } catch {
    return null;
  }
};

const setCachedRate = async (item: PlayData | undefined, rate: number): Promise<void> => {
  const key = getRateCacheKey(item);
  if (!key) return;
  try {
    const store = (await getRuntimeStore(StoreNameMap.PlaybackRate)) || {};
    await setRuntimeStore(StoreNameMap.PlaybackRate, {
      ...store,
      [key]: rate,
    });
  } catch {
    // ignore
  }
};

setNativePlayerRemoteCommandHandler(command => {
  const { next, prev, list } = usePlayList.getState();
  if (command === "next" && list.length > 1) {
    next();
  } else if (command === "prev") {
    prev();
  }
});

const updatePlaybackState = () => {
  if ("mediaSession" in navigator) {
    navigator.mediaSession.playbackState = audio.paused ? "paused" : "playing";
  }

  if (window.electron && window.electron.updatePlaybackState) {
    window.electron.updatePlaybackState(!audio.paused);
  }
};

const playAudioSafely = async () => {
  try {
    await audio.play();
  } catch (error) {
    if ((error as DOMException)?.name === "NotSupportedError") {
      const refreshed = await refreshCurrentAudioSource();
      if (refreshed) {
        try {
          await audio.play();
          return;
        } catch (retryError) {
          handlePlayError(retryError);
          return;
        }
      }
      return;
    }
    handlePlayError(error);
  }
};

const prefetchNextAudioUrl = () => {
  const { playMode, list, playId, nextId } = usePlayList.getState();

  if (!list?.length || !playId) return;

  let nextPlayData: PlayData | undefined;

  if (nextId) {
    nextPlayData = list.find(item => item.id === nextId);
  } else {
    const currentIndex = list.findIndex(item => item.id === playId);
    if (currentIndex === -1) return;

    switch (playMode) {
      case PlayMode.Sequence:
      case PlayMode.Single:
      case PlayMode.Loop: {
        const nextIndex = list.length === 1 ? currentIndex : (currentIndex + 1) % list.length;
        nextPlayData = list[nextIndex];
        break;
      }
      case PlayMode.Random: {
        const currentPlayItem = list[currentIndex];
        if (
          usePlayList.getState().shouldKeepPagesOrderInRandomPlayMode &&
          currentPlayItem.pageIndex &&
          currentPlayItem.pageIndex !== currentPlayItem.totalPage
        ) {
          const nextPage = list.find(
            item => item.bvid === currentPlayItem.bvid && item.pageIndex === currentPlayItem.pageIndex! + 1,
          );
          if (nextPage) nextPlayData = nextPage;
        }
        break;
      }
    }
  }

  if (!nextPlayData || nextPlayData.source === "local") return;

  if (nextPlayData.audioUrl && isUrlValid(nextPlayData.audioUrl)) return;

  if (nextPlayData.type === "mv" && nextPlayData.bvid && nextPlayData.cid) {
    void getDashUrl(nextPlayData.bvid, nextPlayData.cid).then(mvPlayData => {
      if (mvPlayData?.audioUrl) {
        usePlayList.setState(state => {
          const listItem = state.list.find(item => item.id === nextPlayData!.id);
          if (listItem) {
            listItem.audioUrl = mvPlayData.audioUrl;
            listItem.videoUrl = mvPlayData.videoUrl;
            listItem.isLossless = mvPlayData.isLossless;
            listItem.isDolby = mvPlayData.isDolby;
          }
        });
      }
    }).catch(() => {});
  }

  if (nextPlayData.type === "audio" && nextPlayData.sid) {
    void getAudioUrl(nextPlayData.sid).then(musicPlayData => {
      if (musicPlayData?.audioUrl) {
        usePlayList.setState(state => {
          const listItem = state.list.find(item => item.id === nextPlayData!.id);
          if (listItem) {
            listItem.audioUrl = musicPlayData.audioUrl;
            listItem.isLossless = musicPlayData.isLossless;
          }
        });
      }
    }).catch(() => {});
  }
};

const updatePositionState = () => {
  if ("mediaSession" in navigator) {
    const dur = audio.duration;
    if (!Number.isNaN(dur) && dur !== Infinity) {
      navigator.mediaSession.setPositionState({
        duration: dur,
        playbackRate: audio.playbackRate,
        position: audio.currentTime,
      });
    }
  }
};

const TIMEUPDATE_THROTTLE_MS = 66;
let lastTimeUpdateTs = 0;

const syncCurrentTimeState = (force = false) => {
  const now = performance.now();
  if (!force && now - lastTimeUpdateTs < TIMEUPDATE_THROTTLE_MS) return;
  lastTimeUpdateTs = now;
  const currentTime = Math.max(0, Math.round(audio.currentTime * 100) / 100);
  usePlayProgress.getState().setCurrentTime(currentTime);
};

const syncDurationState = () => {
  const dur = audio.duration;
  usePlayList.setState({
    duration: !Number.isNaN(dur) && dur !== Infinity && dur > 0 ? Math.round(dur * 100) / 100 : undefined,
  });
};

export const isSame = (
  item1?: { type: "mv" | "audio"; sid?: number; bvid?: string; source?: "local" | "online"; id?: string },
  item2?: { type: "mv" | "audio"; sid?: number; bvid?: string; source?: "local" | "online"; id?: string },
) => {
  if (!item1 || !item2) {
    return false;
  }
  if (item1.source === "local" || item2.source === "local") {
    return Boolean(item1.id) && Boolean(item2.id) && item1.id === item2.id;
  }
  if (item1.type !== item2.type) {
    return false;
  }
  if (item1.type === "mv") {
    return Boolean(item1.bvid) && Boolean(item2.bvid) && item1.bvid === item2.bvid;
  }
  if (item1.type === "audio") {
    return item1.sid !== undefined && item2.sid !== undefined && item1.sid === item2.sid;
  }
  return false;
};

const shouldReportPlayRecord = (item?: { type: PlayDataType; source?: "local" | "online" }) =>
  item?.type === "mv" && item?.source !== "local";

const shouldReuseAudioUrl = (item?: Pick<PlayData, "source" | "audioUrl" | "isLossless" | "isDolby">) => {
  if (!item?.audioUrl) {
    return false;
  }

  if (!isUrlValid(item.audioUrl)) {
    return false;
  }

  return true;
};

export const usePlayList = create<State & Action>()(
  persist(
    immer((set, get) => {
      const ensureAudioSrcValid = async () => {
        const { playId, list } = get();
        const currentPlayItem = list.find(item => item.id === playId);
        if (currentPlayItem?.source === "local" && currentPlayItem?.audioUrl) {
          if (audio.src !== currentPlayItem.audioUrl) {
            audio.src = currentPlayItem.audioUrl;
          }
          const currentTime = usePlayProgress.getState().currentTime;
          if (typeof currentTime === "number" && currentTime > 0) {
            audio.currentTime = currentTime;
          }
          return;
        }
        const reusableAudioUrl = currentPlayItem && shouldReuseAudioUrl(currentPlayItem) ? currentPlayItem.audioUrl : undefined;
        if (reusableAudioUrl) {
          if (audio.src !== reusableAudioUrl) {
            audio.src = reusableAudioUrl;
          }
          const currentTime = usePlayProgress.getState().currentTime;
          if (typeof currentTime === "number" && currentTime > 0) {
            audio.currentTime = currentTime;
          }
          return;
        }

        if (currentPlayItem?.type === "mv" && currentPlayItem?.bvid && currentPlayItem?.cid) {
          const mvPlayData = await getDashUrl(currentPlayItem.bvid, currentPlayItem.cid);
          if (mvPlayData?.audioUrl) {
            if (audio.src !== mvPlayData.audioUrl) {
              audio.src = mvPlayData.audioUrl;
              const currentTime = usePlayProgress.getState().currentTime;
              if (typeof currentTime === "number") {
                audio.currentTime = currentTime;
              }
            }
            set(state => {
              const listItem = state.list.find(item => item.id === state.playId);
              if (listItem) {
                listItem.audioUrl = mvPlayData.audioUrl;
                listItem.videoUrl = mvPlayData.videoUrl;
                listItem.isLossless = mvPlayData.isLossless;
                listItem.isDolby = mvPlayData.isDolby;
              }
            });
          } else {
            log.error("无法获取音频播放链接", {
              type: "mv",
              bvid: currentPlayItem.bvid,
              cid: currentPlayItem.cid,
              title: currentPlayItem.title,
              mvPlayData,
            });
            toastError("无法获取音频播放链接");
          }
        }

        if (currentPlayItem?.type === "audio" && currentPlayItem?.sid) {
          const musicPlayData = await getAudioUrl(currentPlayItem.sid);
          if (musicPlayData?.audioUrl) {
            if (audio.src !== musicPlayData.audioUrl) {
              audio.src = musicPlayData.audioUrl;
              const currentTime = usePlayProgress.getState().currentTime;
              if (typeof currentTime === "number") {
                audio.currentTime = currentTime;
              }
            }
            set(state => {
              const listItem = state.list.find(item => item.id === state.playId);
              if (listItem) {
                listItem.audioUrl = musicPlayData.audioUrl;
                listItem.isLossless = musicPlayData.isLossless;
              }
            });
          } else {
            log.error("无法获取音频播放链接", {
              type: "audio",
              sid: currentPlayItem.sid,
              title: currentPlayItem.title,
              musicPlayData,
            });
            toastError("无法获取音频播放链接");
          }
        }
      };

      const URL_EXPIRY_CHECK_INTERVAL_MS = 30_000;
      const URL_EXPIRY_THRESHOLD_SECONDS = 120;
      let urlExpiryCheckTimer: ReturnType<typeof setInterval> | null = null;
      let isRefreshingUrl = false;

      const silentRefreshAudioUrl = async () => {
        if (isRefreshingUrl) return;
        isRefreshingUrl = true;
        try {
        const { playId, list } = get();
        const item = list.find(i => i.id === playId);
        if (!item || item.source === "local") return;

        if (item.type === "mv" && item.bvid && item.cid) {
          try {
            const mvPlayData = await getDashUrl(item.bvid, item.cid);
            if (mvPlayData?.audioUrl) {
              set(state => {
                const listItem = state.list.find(i => i.id === state.playId);
                if (listItem) {
                  listItem.audioUrl = mvPlayData.audioUrl;
                  listItem.videoUrl = mvPlayData.videoUrl;
                  listItem.isLossless = mvPlayData.isLossless;
                  listItem.isDolby = mvPlayData.isDolby;
                }
              });
              if (audio && !audio.paused) {
                const currentTime = audio.currentTime;
                audio.src = mvPlayData.audioUrl;
                audio.currentTime = currentTime;
                void audio.play();
              }
            }
          } catch (e) {
            log.warn("[play-list] silent refresh mv url failed", e);
          }
        }

        if (item.type === "audio" && item.sid) {
          try {
            const musicPlayData = await getAudioUrl(item.sid);
            if (musicPlayData?.audioUrl) {
              set(state => {
                const listItem = state.list.find(i => i.id === state.playId);
                if (listItem) {
                  listItem.audioUrl = musicPlayData.audioUrl;
                  listItem.isLossless = musicPlayData.isLossless;
                }
              });
              if (audio && !audio.paused) {
                const currentTime = audio.currentTime;
                audio.src = musicPlayData.audioUrl;
                audio.currentTime = currentTime;
                void audio.play();
              }
            }
          } catch (e) {
            log.warn("[play-list] silent refresh audio url failed", e);
          }
        }
        } finally {
          isRefreshingUrl = false;
        }
      };

      const startUrlExpiryCheck = () => {
        stopUrlExpiryCheck();
        urlExpiryCheckTimer = setInterval(() => {
          const item = get().list.find(i => i.id === get().playId);
          if (!item?.audioUrl || item.source === "local") return;
          const remainingSeconds = getUrlExpirySeconds(item.audioUrl);
          if (remainingSeconds > 0 && remainingSeconds <= URL_EXPIRY_THRESHOLD_SECONDS) {
            void silentRefreshAudioUrl();
          }
        }, URL_EXPIRY_CHECK_INTERVAL_MS);
      };

      const stopUrlExpiryCheck = () => {
        if (urlExpiryCheckTimer !== null) {
          clearInterval(urlExpiryCheckTimer);
          urlExpiryCheckTimer = null;
        }
      };

      return {
        isPlaying: false,
        isMuted: false,
        volume: 0.5,
        playMode: PlayMode.Loop,
        rate: 1,
        duration: undefined,
        shouldKeepPagesOrderInRandomPlayMode: true,
        isOnline: navigator.onLine,
        list: [],
        init: async () => {
          if (audio) {
            const { volume: initialVolume, isMuted: initialMuted } = getRuntimeVolumeState(get());

            audio.volume = initialVolume;
            audio.muted = initialMuted;
            audio.playbackRate = get().rate;
            audio.loop = get().playMode === PlayMode.Single;

            audio.onloadedmetadata = () => {
              syncDurationState();
              syncCurrentTimeState(true);
              updatePositionState();
            };

            audio.oncanplay = () => {
              syncDurationState();
              updatePositionState();
            };

            audio.ondurationchange = () => {
              syncDurationState();
              updatePositionState();
            };

            audio.ontimeupdate = () => {
              syncCurrentTimeState();
            };

            audio.onseeked = () => {
              syncCurrentTimeState(true);
              updatePositionState();
            };

            audio.onratechange = () => {
              updatePositionState();
            };

            audio.onplaying = () => {
              set({ isPlaying: true });
              syncDurationState();
              updatePlaybackState();
              updatePositionState();
              startUrlExpiryCheck();
              prefetchNextAudioUrl();
            };

            audio.onplay = () => {
              set({ isPlaying: true });
              syncDurationState();
              updatePlaybackState();
              updatePositionState();
              const playItem = get().getPlayItem?.();
              if (shouldReportPlayRecord(playItem)) {
                void reportHeartbeat(playItem, audio.currentTime, audio.duration, 1);
              }
            };

            audio.onpause = () => {
              set({ isPlaying: false });
              syncCurrentTimeState(true);
              updatePlaybackState();
              updatePositionState();
              stopUrlExpiryCheck();
              const playItem = get().getPlayItem?.();
              if (shouldReportPlayRecord(playItem)) {
                void reportHeartbeat(playItem, audio.currentTime, audio.duration, 2);
              }
            };

            audio.onerror = () => {
              set({ isPlaying: false, duration: undefined });
              updatePlaybackState();
              stopUrlExpiryCheck();
            };

            audio.onemptied = () => {
              set({ isPlaying: false, duration: undefined });
              usePlayProgress.getState().setCurrentTime(0);
              updatePlaybackState();
            };

            audio.onended = () => {
              if (get().playMode === PlayMode.Single) {
                return;
              }

              const playItem = get().getPlayItem?.();
              if (shouldReportPlayRecord(playItem)) {
                void reportHeartbeat(playItem, audio.duration, audio.duration, 4);
                endPlayReport();
              }

              const currentIndex = get().list.findIndex(item => item.id === get().playId);
              if (get().playMode === PlayMode.Sequence && currentIndex === get().list.length - 1) {
                audio.currentTime = 0;
                audio.pause();
                return;
              }

              get().next();
            };

            const handleOffline = () => {
              log.warn("[play-list] network offline, pausing playback");
              set({ isOnline: false });
              if (!audio.paused) {
                audio.pause();
              }
              addToast({
                title: "网络已断开",
                description: "请检查网络连接",
                color: "warning",
              });
            };

            const handleOnline = () => {
              log.info("[play-list] network online");
              set({ isOnline: true });
              if (get().playId && audio.paused && !get().isPlaying) {
                void ensureAudioSrcValid().then(() => {
                  if (audio.src) {
                    void audio.play();
                  }
                });
              }
            };

            window.addEventListener("offline", handleOffline);
            window.addEventListener("online", handleOnline);

            if ("mediaSession" in navigator) {
              navigator.mediaSession.setActionHandler("play", () => get().togglePlay());
              navigator.mediaSession.setActionHandler("pause", () => get().togglePlay());
              navigator.mediaSession.setActionHandler("previoustrack", () => get().prev());
              navigator.mediaSession.setActionHandler("nexttrack", () => {
                if (get().list.length > 1) {
                  get().next();
                }
              });
              navigator.mediaSession.setActionHandler("seekto", details => {
                if (details.seekTime) get().seek(Math.round(details.seekTime * 100) / 100);
                updatePositionState();
              });
              navigator.mediaSession.setActionHandler("seekbackward", details => {
                const offset = details?.seekOffset || 10;
                get().seek(Math.round((audio.currentTime - offset) * 100) / 100);
              });
              navigator.mediaSession.setActionHandler("seekforward", details => {
                const offset = details?.seekOffset || 10;
                get().seek(Math.round((audio.currentTime + offset) * 100) / 100);
              });
            }

            if (get().playId) {
              const playItem = get().list.find(item => item.id === get().playId);
              if (playItem) {
                if (playItem.duration) {
                  set({ duration: playItem.duration });
                }

                try {
                  await ensureAudioSrcValid();
                } catch (e) {
                  log.warn("[play-list] restore audio source failed", e);
                }

                const localCurrentTime = usePlayProgress.getState().initCurrentTime();
                if (localCurrentTime) {
                  audio.currentTime = localCurrentTime;
                }

                updateMediaSession({
                  title: playItem.title,
                  artist: playItem.ownerName,
                  cover: playItem.pageCover,
                });
              }
            }
          }
        },
        toggleMute: () => {
          if (shouldFollowSystemVolume()) {
            return;
          }
          if (audio) {
            audio.muted = !audio.muted;
          }
          set(s => ({ isMuted: !s.isMuted }));
        },
        setVolume: volume => {
          const nextVolume = clampVolume(volume);
          if (shouldFollowSystemVolume()) {
            set(state => {
              state.volume = nextVolume;
            });
            return;
          }
          if (audio) {
            audio.volume = nextVolume;
          }
          set(state => {
            state.volume = nextVolume;
          });
        },
        syncVolumePreference: () => {
          if (!audio) {
            return;
          }

          const { volume, isMuted } = getRuntimeVolumeState(get());
          audio.volume = volume;
          audio.muted = isMuted;
        },
        togglePlayMode: () => {
          const playModeList = getPlayModeList();
          const currentIndex = playModeList.findIndex(item => item.value === get().playMode);
          const nextIndex = (currentIndex + 1) % playModeList.length;
          const nextPlayMode = playModeList[nextIndex].value;

          if (audio) {
            audio.loop = nextPlayMode === PlayMode.Single;
          }
          set(state => {
            state.playMode = nextPlayMode;
          });
        },
        setRate: rate => {
          if (audio) {
            audio.playbackRate = rate;
          }
          set(state => {
            state.rate = rate;
          });
          // 保存当前歌曲的播放速度
          const currentItem = get().getPlayItem();
          if (currentItem) {
            void setCachedRate(currentItem, rate);
          }
        },
        seek: s => {
          usePlayProgress.getState().setCurrentTime(s);
          if (audio) {
            audio.currentTime = s;
          }
        },
        togglePlay: async () => {
          if (!get().list?.length) {
            return;
          }

          if (!get().playId) {
            return;
          }

          if (audio.paused) {
            await ensureAudioSrcValid();
            await playAudioSafely();
          } else {
            audio.pause();
          }
        },
        setShouldKeepPagesOrderInRandomPlayMode: shouldKeep => {
          set({ shouldKeepPagesOrderInRandomPlayMode: shouldKeep });
        },
        play: async ({ type, bvid, sid, title, cover, ownerName, ownerMid, id, source, audioUrl }: PlayItem) => {
          const { list, playId } = get();
          const currentItem = list?.find(item => item.id === playId);
          const sanitizedTitle = sanitizeTitle(title);
          const candidate = { type, bvid, sid, source, id };

          // 当前正在播放，如果暂停了则播放
          if (isSame(currentItem, candidate)) {
            if (audio.paused) {
              await ensureAudioSrcValid();
              await playAudioSafely();
            }
            return;
          }

          // 列表已存在
          const existItem = list?.find(item => isSame(item, candidate));
          if (existItem) {
            set({ playId: existItem.id });
            return;
          }

          const isLocal = source === "local";
          // 新添加项
          let playItem: PlayData[] =
            isLocal && id
              ? [
                  {
                    id,
                    type,
                    source,
                    audioUrl,
                    title: sanitizedTitle,
                  },
                ]
              : [
                  {
                    id: idGenerator(),
                    type,
                    bvid,
                    sid,
                    title: sanitizedTitle,
                    cover: cover ? formatUrlProtocol(cover) : undefined,
                    ownerName,
                    ownerMid,
                  },
                ];
          // 补充缺失信息
          if (!isLocal && (!cover || !ownerName || !ownerMid)) {
            if (type === "mv" && bvid) {
              playItem = await getMVData(bvid);
            }

            if (type === "audio" && sid) {
              playItem = await getAudioData(sid);
            }
          }

          const nextPlayItem = playItem[0];
          if (!nextPlayItem) {
            toastError("播放失败：无法获取播放信息");
            return;
          }

          set(state => {
            state.list = [...state.list, ...playItem];
            state.playId = nextPlayItem.id;
          });
        },
        playListItem: async (id: string) => {
          if (get().playId === id) {
            if (audio.paused) {
              await get().togglePlay();
            }
            return;
          }

          set(state => {
            state.playId = id;
            if (state.nextId === id) {
              state.nextId = undefined;
            }
          });
        },
        playList: async items => {
          const newList = items.map(item => ({
            ...item,
            title: sanitizeTitle(item.title),
            id: item.source === "local" && item.id ? item.id : idGenerator(),
          }));

          set(state => {
            state.list = newList;
            state.playId = newList[0].id;
          });
        },
        next: async () => {
          const { playMode, list, playId, nextId, shouldKeepPagesOrderInRandomPlayMode } = get();

          if (!list?.length) {
            return;
          }

          if (!playId) {
            return;
          }

          if (nextId) {
            set(state => {
              state.playId = nextId;
              state.nextId = undefined;
            });
            return;
          }

          const currentIndex = list.findIndex(item => item.id === playId);
          const nextIndex = (currentIndex + 1) % list.length;
          switch (playMode) {
            case PlayMode.Sequence:
            case PlayMode.Single:
            case PlayMode.Loop: {
              if (list.length === 1) {
                audio.currentTime = 0;
                await playAudioSafely();
                break;
              }

              set(state => {
                state.playId = list[nextIndex].id;
              });
              break;
            }
            case PlayMode.Random: {
              const currentPlayItem = list[currentIndex];

              if (list.length === 1) {
                audio.currentTime = 0;
                await playAudioSafely();
                break;
              }

              // 保持分集顺序，且当前为分集视频，且不是最后一集
              if (
                shouldKeepPagesOrderInRandomPlayMode &&
                currentPlayItem.pageIndex &&
                currentPlayItem.pageIndex !== currentPlayItem.totalPage
              ) {
                const nextPage = list.find(
                  item => item.bvid === currentPlayItem.bvid && item.pageIndex === currentPlayItem.pageIndex! + 1,
                );
                if (nextPage) {
                  set({ playId: nextPage.id });
                  break;
                }
              }

              const shuffledList = shuffle(list?.map(item => item.id));
              const currentIndexInShuffled = shuffledList.findIndex(shuffled => shuffled === playId);
              const nextShuffledIndex = (currentIndexInShuffled + 1) % shuffledList.length;
              set(state => {
                state.playId = shuffledList[nextShuffledIndex];
              });
              break;
            }
          }
        },
        prev: async () => {
          const { playId, list } = get();

          if (!list?.length) {
            return;
          }

          if (!playId) {
            return;
          }

          const currentIndex = list.findIndex(item => item.id === playId);
          if (currentIndex === -1) return;

          const prevIndex = (currentIndex - 1 + list.length) % list.length;

          set(state => {
            state.playId = list[prevIndex].id;
          });
        },
        addToNext: async ({ type, title, bvid, sid, cover, ownerName, ownerMid, id, source, audioUrl }) => {
          const { playId, nextId: currentNextId, list } = get();
          const currentItem = list.find(item => item.id === playId);
          const sanitizedTitle = sanitizeTitle(title);
          const candidate = { type, bvid, sid, source, id };
          // 如果当前正在播放，则不添加
          if (isSame(candidate, currentItem)) {
            return;
          }

          // 如果下一首就是要添加的，则不添加
          if (currentNextId) {
            const currentNextItem = list.find(item => item.id === currentNextId);
            if (isSame(candidate, currentNextItem)) {
              return;
            }
          }

          // 列表已存在
          const existItemIndex = list?.findIndex(item => isSame(item, candidate)) ?? -1;
          if (existItemIndex !== -1) {
            set(state => {
              state.nextId = list[existItemIndex].id;
              // 将已存在项移动到下一首
              const currentItemIndex = list.findIndex(item => item.id === playId);
              if (currentItemIndex !== existItemIndex - 1) {
                state.list.splice(existItemIndex, 1);
                state.list.splice(currentItemIndex, 0, list[existItemIndex]);
              }
            });
            return;
          }

          let nextPlayItem: PlayData[] =
            source === "local" && id
              ? [
                  {
                    id,
                    type,
                    bvid,
                    sid,
                    source,
                    audioUrl,
                    title: sanitizedTitle,
                    cover: cover ? formatUrlProtocol(cover) : undefined,
                    ownerName,
                    ownerMid,
                  },
                ]
              : [
                  {
                    id: idGenerator(),
                    type,
                    bvid,
                    sid,
                    title: sanitizedTitle,
                    cover: cover ? formatUrlProtocol(cover) : undefined,
                    ownerName,
                    ownerMid,
                  },
                ];
          if (source !== "local" && (!cover || !ownerName || !ownerMid)) {
            if (type === "mv" && bvid) {
              nextPlayItem = await getMVData(bvid);
            }

            if (type === "audio" && sid) {
              nextPlayItem = await getAudioData(sid);
            }
          }

          if (!nextPlayItem || nextPlayItem.length === 0) {
            toastError("添加失败：无法获取播放信息");
            return;
          }

          const nextId = nextPlayItem[0].id;
          // 空列表，直接播放
          if (list.length === 0) {
            set({
              playId: nextId,
              list: nextPlayItem,
            });
            return;
          }

          // 当前播放的是音频，则直接插入到其后面
          if (currentItem?.type === "audio") {
            set(state => {
              state.nextId = nextId;
              const currentItemIndex = list.findIndex(item => item.id === state.playId);
              state.list.splice(currentItemIndex + 1, 0, ...nextPlayItem);
            });
          }

          // 当前播放的是视频，找到最后一个分集的索引，插入到其后面
          if (currentItem?.type === "mv") {
            const currentMVLastPageIndex = list.findLastIndex(item =>
              isSame(item, { type: "mv", bvid: currentItem.bvid }),
            );
            set(state => {
              state.nextId = nextId;
              state.list.splice(currentMVLastPageIndex + 1, 0, ...nextPlayItem);
            });
          }
        },
        addList: async items => {
          const { list, playId } = get();
          if (list.length === 0) {
            get().playList(items);
            return;
          }

          const currentItem = list.find(item => item.id === playId);

          const paddingItems = items
            .filter(item => {
              if (currentItem && isSame(item, currentItem)) {
                return false;
              }
              return !list.some(existing => isSame(existing, item));
            })
            .map(item => ({
              ...item,
              title: sanitizeTitle(item.title),
              id: item.source === "local" && item.id ? item.id : idGenerator(),
            }));

          if (paddingItems.length === 0) {
            return;
          }

          set({
            list: [...list, ...paddingItems],
          });
        },
        delPage: async id => {
          if (get().list.length === 1) {
            get().clear();
            return;
          }

          if (id === get().playId) {
            try {
              await get().next();
            } catch (error) {
              handlePlayError(error);
            }
          }

          set(state => {
            const removeIndex = state.list.findIndex(item => item.id === id);
            if (removeIndex !== -1) {
              state.list.splice(removeIndex, 1);
            }
          });
        },
        del: async id => {
          if (get().list.length === 1) {
            get().clear();
            return;
          }

          const { playId, list } = get();
          const playItem = list.find(item => item.id === playId);
          const removedItem = list.find(item => item.id === id);

          if (isSame(playItem, removedItem)) {
            if (removedItem?.type === "audio") {
              try {
                await get().next();
              } catch (error) {
                handlePlayError(error);
              }
            } else {
              if (list.some(item => !isSame(item, removedItem))) {
                const lastIndex = list.findLastIndex(item => isSame(item, removedItem));
                if (lastIndex !== -1) {
                  const nextPlayIndex = (lastIndex + 1) % list.length;
                  set(state => {
                    state.playId = state.list[nextPlayIndex].id;
                  });
                }
              } else {
                get().clear();
                return;
              }
            }
          }

          set(state => {
            remove(state.list, item => isSame(item, removedItem));
          });
        },
        reorder: (fromIndex: number, toIndex: number) => {
          const { list } = get();
          if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) return;
          set(state => {
            const [moved] = state.list.splice(fromIndex, 1);
            state.list.splice(toIndex, 0, moved);
          });
        },
        clear: () => {
          const currentPlayItem = get().getPlayItem?.();
          if (shouldReportPlayRecord(currentPlayItem)) {
            endPlayReport();
          }
          if (audio) {
            audio.src = "";
            if (!audio.paused) {
              audio.pause();
            }
          }
          set(state => {
            state.isPlaying = false;
            state.duration = undefined;
            state.list = [];
            state.playId = undefined;
            state.nextId = undefined;
          });
          usePlayProgress.getState().setCurrentTime(0);
        },
        getPlayItem: () => {
          const { playId, list } = get();
          const playItem = list.find(item => item.id === playId);
          return playItem;
        },
        getAudio: () => audio,
      };
    }),
    {
      name: "play-list-store",
      partialize: state => ({
        isMuted: state.isMuted,
        volume: state.volume,
        playMode: state.playMode,
        rate: state.rate,
        list: state.list.map(item => ({
          id: item.id,
          type: item.type,
          bvid: item.bvid,
          sid: item.sid,
          aid: item.aid,
          cid: item.cid,
          title: item.title,
          cover: item.cover,
          ownerName: item.ownerName,
          ownerMid: item.ownerMid,
          hasMultiPart: item.hasMultiPart,
          pageTitle: item.pageTitle,
          pageCover: item.pageCover,
          pageIndex: item.pageIndex,
          totalPage: item.totalPage,
          duration: item.duration,
          source: item.source,
          isLossless: item.isLossless,
          isDolby: item.isDolby,
        })),
        playId: state.playId,
        nextId: state.nextId,
        shouldKeepPagesOrderInRandomPlayMode: state.shouldKeepPagesOrderInRandomPlayMode,
      }),
    },
  ),
);

async function refreshCurrentAudioSource(): Promise<boolean> {
  const { getPlayItem } = usePlayList.getState();
  const playItem = getPlayItem?.();

  if (!playItem) {
    return false;
  }

  try {
    if (playItem.type === "mv" && playItem.bvid && playItem.cid) {
      const mvPlayData = await getDashUrl(playItem.bvid, playItem.cid);
      if (mvPlayData?.audioUrl) {
        audio.src = mvPlayData.audioUrl;
        usePlayList.setState(state => {
          const listItem = state.list.find(item => item.id === state.playId);
          if (listItem) {
            listItem.audioUrl = mvPlayData.audioUrl;
            listItem.videoUrl = mvPlayData.videoUrl;
            listItem.isLossless = mvPlayData.isLossless;
            listItem.isDolby = mvPlayData.isDolby;
          }
        });
        return true;
      }
    }

    if (playItem.type === "audio" && playItem.sid) {
      const musicPlayData = await getAudioUrl(playItem.sid);
      if (musicPlayData?.audioUrl) {
        audio.src = musicPlayData.audioUrl;
        usePlayList.setState(state => {
          const listItem = state.list.find(item => item.id === state.playId);
          if (listItem) {
            listItem.audioUrl = musicPlayData.audioUrl;
            listItem.isLossless = musicPlayData.isLossless;
          }
        });
        return true;
      }
    }
  } catch (refreshError) {
    log.error("刷新播放链接失败", {
      playItem,
      refreshError,
    });
    handlePlayError(refreshError);
  }

  return false;
}

function resetAudioAndPlay(url: string) {
  console.log("[audio] resetAudioAndPlay:", url?.substring(0, 120));
  usePlayList.setState({
    isPlaying: false,
    duration: undefined,
  });
  usePlayProgress.getState().setCurrentTime(0);
  updatePlaybackState();
  audio.src = url;
  audio.currentTime = 0;
  audio.load();
  void playAudioSafely();

  // 异步恢复该歌曲的播放速度
  const playItem = usePlayList.getState().getPlayItem();
  void getCachedRate(playItem).then(cachedRate => {
    if (cachedRate !== null && cachedRate !== usePlayList.getState().rate) {
      audio.playbackRate = cachedRate;
      usePlayList.setState({ rate: cachedRate });
    }
  });
}

// 切换歌曲时，更新当前播放的歌曲信息
usePlayList.subscribe(async (state, prevState) => {
  if (state.playId !== prevState.playId) {
    if (!state.playId) {
      const prevPlayItem = prevState.list.find(item => item.id === prevState.playId);
      if (shouldReportPlayRecord(prevPlayItem)) {
        endPlayReport();
      }
    }

    if (audio && !audio.paused) {
      audio.pause();
      audio.currentTime = 0;
    }
    // 切换歌曲
    if (state.playId) {
      const playItem = state.list.find(item => item.id === state.playId);
      if (playItem) {
        if (shouldReportPlayRecord(playItem)) {
          void beginPlayReport(playItem);
        }
      }
      if (playItem?.source === "local" && playItem?.audioUrl) {
        resetAudioAndPlay(playItem.audioUrl);
        return;
      }
      const reusableAudioUrl = playItem && shouldReuseAudioUrl(playItem) ? playItem.audioUrl : undefined;
      if (reusableAudioUrl) {
        resetAudioAndPlay(reusableAudioUrl);
        return;
      }

      if (playItem?.type === "mv") {
        if (playItem?.bvid && playItem?.cid) {
          const mvPlayData = await getDashUrl(playItem.bvid, playItem.cid);
          if (mvPlayData?.audioUrl) {
            resetAudioAndPlay(mvPlayData?.audioUrl);

            updateMediaSession({
              title: playItem.pageTitle || playItem.title,
              artist: playItem.ownerName,
              cover: playItem.pageCover,
            });

            usePlayList.setState(state => {
              const listItem = state.list.find(item => item.id === state.playId);
              if (listItem) {
                listItem.audioUrl = mvPlayData?.audioUrl;
                listItem.videoUrl = mvPlayData?.videoUrl;
                listItem.isLossless = mvPlayData?.isLossless;
                listItem.isDolby = mvPlayData?.isDolby;
              }
            });
          } else {
            log.error("无法获取音频播放链接", {
              type: "mv",
              bvid: playItem.bvid,
              cid: playItem.cid,
              title: playItem.title,
              mvPlayData,
            });
            toastError("无法获取音频播放链接");
          }
        } else if (playItem?.bvid) {
          const mvData = await getMVData(playItem.bvid);
          const [firstMV, ...restMV] = mvData;
          if (firstMV?.cid) {
            const mvPlayData = await getDashUrl(playItem.bvid, firstMV.cid);
            if (mvPlayData?.audioUrl) {
              resetAudioAndPlay(mvPlayData?.audioUrl);

              updateMediaSession({
                title: firstMV.pageTitle || firstMV.title,
                artist: firstMV.ownerName,
                cover: firstMV.pageCover,
              });

              usePlayList.setState(state => {
                const listItemIndex = state.list.findIndex(item => item.id === state.playId);
                state.list.splice(
                  listItemIndex,
                  1,
                  {
                    ...firstMV,
                    ...{
                      audioUrl: mvPlayData?.audioUrl,
                      videoUrl: mvPlayData?.videoUrl,
                      isLossless: mvPlayData?.isLossless,
                      isDolby: mvPlayData?.isDolby,
                    },
                  },
                  ...restMV,
                );
                state.playId = firstMV.id;
              });
            } else {
              log.error("无法获取音频播放链接", {
                type: "mv",
                bvid: playItem.bvid,
                cid: firstMV.cid,
                title: firstMV.title,
                mvPlayData,
              });
              toastError("无法获取音频播放链接");
            }
          } else {
            log.error("无法获取音频播放链接", {
              type: "mv",
              bvid: playItem.bvid,
              title: playItem.title,
              mvData,
            });
            toastError("无法获取音频播放链接");
          }
        }
      }

      if (playItem?.type === "audio" && playItem?.sid) {
        const musicPlayData = await getAudioUrl(playItem.sid);
        if (musicPlayData?.audioUrl) {
          resetAudioAndPlay(musicPlayData?.audioUrl);

          updateMediaSession({
            title: playItem.title,
            artist: playItem.ownerName,
            cover: playItem.pageCover,
          });

          usePlayList.setState(state => {
            const listItem = state.list.find(item => item.id === state.playId);
            if (listItem) {
              listItem.audioUrl = musicPlayData?.audioUrl;
            }
          });
        } else {
          log.error("无法获取音频播放链接", {
            type: "audio",
            sid: playItem.sid,
            title: playItem.title,
            musicPlayData,
          });
          toastError("无法获取音频播放链接");
        }
      }
    }
  }
});

let previousFollowSystemVolume = useSettings.getState().followSystemVolume;

useSettings.subscribe(state => {
  if (state.followSystemVolume === previousFollowSystemVolume) {
    return;
  }

  previousFollowSystemVolume = state.followSystemVolume;
  usePlayList.getState().syncVolumePreference();
});

bindDurationGetter(() => usePlayList.getState().duration);
