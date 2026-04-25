import log from "@/common/utils/logger";
import dayjs from "dayjs";

import { getAudioWebStreamUrl } from "@/service/audio-web-url";
import { getPlayerPlayurl, type DashAudio } from "@/service/player-playurl";
import { useSettings } from "@/store/settings";
import { useUser } from "@/store/user";

import { audioQualitySort } from "../constants/audio";
import { VideoFnval } from "../constants/video";
import { getUrlParams } from "./url";

function sortAudio(audio: DashAudio[]) {
  return audio.toSorted((a, b) => {
    if (a.bandwidth !== b.bandwidth) {
      return b.bandwidth - a.bandwidth;
    }

    const indexA = audioQualitySort.indexOf(a.id);
    const indexB = audioQualitySort.indexOf(b.id);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexB - indexA;
  });
}

function selectAudioByQuality(audioList: DashAudio[], quality: AudioQuality): DashAudio | undefined {
  if (!audioList.length) return undefined;

  const sortedList = sortAudio(audioList);

  switch (quality) {
    case "high":
      return sortedList[0];
    case "medium": {
      const midIndex = Math.floor((sortedList.length - 1) / 2);
      return sortedList[midIndex];
    }
    case "low":
      return sortedList[sortedList.length - 1];
    default:
      return sortedList[0];
  }
}

function getNetworkEffectiveType(): string {
  const connection = (navigator as unknown as { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
  return connection?.effectiveType ?? "4g";
}

function isSaveDataEnabled(): boolean {
  const connection = (navigator as unknown as { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

function applyNetworkAwareQuality(quality: AudioQuality): AudioQuality {
  if (isSaveDataEnabled()) {
    return "medium";
  }

  const effectiveType = getNetworkEffectiveType();
  if (effectiveType === "2g" || effectiveType === "slow-2g") {
    return "low";
  }
  if (effectiveType === "3g") {
    if (quality === "auto" || quality === "lossless") {
      return "medium";
    }
  }

  return quality;
}

function resolveDashAudioQuality(requestedQuality?: AudioQuality): AudioQuality {
  const userQuality = requestedQuality ?? useSettings.getState().audioQuality ?? "auto";
  return applyNetworkAwareQuality(userQuality);
}

function resolveAudioSongQuality() {
  const userQuality = useSettings.getState().audioQuality ?? "auto";
  const quality = applyNetworkAwareQuality(userQuality);
  const canUseLossless = Boolean(useUser.getState().user?.vipStatus);

  switch (quality) {
    case "low":
      return 0;
    case "medium":
      return 1;
    case "high":
      return 2;
    case "lossless":
      return canUseLossless ? 3 : 2;
    case "auto":
    default:
      return canUseLossless ? 3 : 2;
  }
}

export async function getDashUrl(bvid: string, cid: string | number, audioQuality?: AudioQuality) {
  try {
    const resolvedQuality = resolveDashAudioQuality(audioQuality);
    const getUrlInfoRes = await getPlayerPlayurl({
      bvid,
      cid,
      fnval: VideoFnval.AllDash,
    });

    const bestVideoInfo = getUrlInfoRes?.data?.dash?.video?.[0];
    const videoResolution = `${bestVideoInfo?.width}x${bestVideoInfo?.height}`;
    const videoUrl = bestVideoInfo?.baseUrl || bestVideoInfo?.backupUrl?.[0];
    const flacAudio = getUrlInfoRes?.data?.dash?.flac?.audio;
    const dolbyAudio = getUrlInfoRes?.data?.dash?.dolby?.audio?.[0];

    if (resolvedQuality === "auto" || resolvedQuality === "lossless") {
      if (flacAudio) {
        return {
          isLossless: true,
          audioCodecs: flacAudio.codecs.toLowerCase(),
          audioBandwidth: flacAudio.bandwidth,
          audioUrl: flacAudio.baseUrl || flacAudio.backupUrl[0],
          videoUrl,
          videoResolution,
        };
      }

      if (dolbyAudio) {
        return {
          isLossless: false,
          isDolby: true,
          audioCodecs: dolbyAudio.codecs.toLowerCase(),
          audioBandwidth: dolbyAudio.bandwidth,
          audioUrl: dolbyAudio.baseUrl || dolbyAudio.backupUrl?.[0] || "",
          videoUrl,
          videoResolution: `${bestVideoInfo?.width}x${bestVideoInfo?.height}`,
        };
      }
    }

    const audioList = getUrlInfoRes?.data?.dash?.audio || [];
    const selectedAudio = selectAudioByQuality(audioList, resolvedQuality);
    return {
      isLossless: false,
      audioCodecs: selectedAudio?.codecs?.toLowerCase() || "",
      audioBandwidth: selectedAudio?.bandwidth,
      audioUrl: selectedAudio?.baseUrl || selectedAudio?.backupUrl?.[0] || "",
      videoUrl,
      videoResolution,
    };
  } catch (error) {
    log.error("[Get video play url error]", error);

    if (audioQuality === undefined) {
      try {
        return await getDashUrl(bvid, cid, "high");
      } catch {
        return { isLossless: false };
      }
    }

    if (audioQuality === "high" || audioQuality === "lossless") {
      try {
        return await getDashUrl(bvid, cid, "medium");
      } catch {
        return { isLossless: false };
      }
    }

    return {
      isLossless: false,
    };
  }
}

/**
 * 登录情况下获取音乐播放链接
 */
export const getAudioUrl = async (sid: number | string, quality?: number) => {
  const songQuality = quality ?? resolveAudioSongQuality();

  const res = await getAudioWebStreamUrl({
    songid: sid,
    quality: songQuality,
    privilege: 2,
    mid: useUser.getState().user?.mid || 0,
    platform: "web",
  });

  const isFlac = res?.data?.type === 3;

  if (!res?.data?.cdns?.[0] && songQuality >= 2) {
    return getAudioUrl(sid, songQuality - 1);
  }

  return {
    audioUrl: res?.data?.cdns?.[0],
    audioCodecs: isFlac ? "flac" : "",
    isLossless: isFlac,
  };
};

/** URL是否有效 */
export const isUrlValid = (url?: string): url is string => {
  return Boolean(url) && dayjs().isBefore(dayjs.unix(Number(getUrlParams(url as string).deadline)));
};

export const getUrlExpirySeconds = (url?: string): number => {
  if (!url) return 0;
  const deadline = Number(getUrlParams(url).deadline);
  if (!Number.isFinite(deadline)) return 0;
  return Math.max(0, deadline - dayjs().unix());
};
