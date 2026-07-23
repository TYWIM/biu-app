import { Capacitor, CapacitorHttp } from "@capacitor/core";

const SPONSOR_BLOCK_API = "https://www.bsbsb.top/api/skipSegments";

export const AUTO_SKIP_CATEGORIES = ["sponsor", "padding", "music_offtopic"] as const;

export type SponsorBlockCategory = (typeof AUTO_SKIP_CATEGORIES)[number];

export interface SponsorBlockSegment {
  start: number;
  end: number;
  category: SponsorBlockCategory;
}

interface SponsorBlockApiSegment {
  cid?: string | number;
  category?: string;
  actionType?: string;
  segment?: number[];
  hidden?: number;
}

interface SponsorBlockApiVideo {
  videoID?: string;
  segments?: SponsorBlockApiSegment[];
}

const responseCache = new Map<string, Promise<SponsorBlockApiVideo[]>>();

const parseResponse = (data: unknown): SponsorBlockApiVideo[] => {
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as unknown;
      return Array.isArray(parsed) ? (parsed as SponsorBlockApiVideo[]) : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(data) ? (data as SponsorBlockApiVideo[]) : [];
};

export const getSponsorBlockHashPrefix = async (bvid: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(bvid));
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 4);
};

export const normalizeSponsorBlockSegments = (data: unknown, bvid: string, cid: string): SponsorBlockSegment[] => {
  const video = parseResponse(data).find(item => item.videoID === bvid);
  const segments = (video?.segments ?? [])
    .filter(segment => {
      const [start, end] = segment.segment ?? [];
      return (
        String(segment.cid ?? "") === cid &&
        segment.actionType === "skip" &&
        AUTO_SKIP_CATEGORIES.includes(segment.category as SponsorBlockCategory) &&
        !segment.hidden &&
        Number.isFinite(start) &&
        Number.isFinite(end) &&
        start >= 0 &&
        end > start
      );
    })
    .map(segment => ({
      start: segment.segment![0],
      end: segment.segment![1],
      category: segment.category as SponsorBlockCategory,
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end);

  return segments.reduce<SponsorBlockSegment[]>((merged, segment) => {
    const previous = merged.at(-1);
    if (previous && segment.start <= previous.end + 0.05) {
      previous.end = Math.max(previous.end, segment.end);
      return merged;
    }
    merged.push({ ...segment });
    return merged;
  }, []);
};

export const findSponsorBlockSkipTarget = (segments: SponsorBlockSegment[], currentTime: number) => {
  const active = segments.find(segment => currentTime >= segment.start && currentTime < segment.end - 0.05);
  return active?.end;
};

const fetchPrefixResponse = (prefix: string) => {
  const cached = responseCache.get(prefix);
  if (cached) return cached;

  const request = (async () => {
    const url = `${SPONSOR_BLOCK_API}/${prefix}`;
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.get({
        url,
        headers: { Accept: "application/json", Cookie: "" },
        connectTimeout: 10000,
        readTimeout: 10000,
      });
      if (response.status === 404) return [];
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`SponsorBlock request failed with status ${response.status}`);
      }
      return parseResponse(response.data);
    }

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      credentials: "omit",
    });
    if (response.status === 404) return [];
    if (!response.ok) {
      throw new Error(`SponsorBlock request failed with status ${response.status}`);
    }
    return parseResponse(await response.json());
  })().catch(error => {
    responseCache.delete(prefix);
    throw error;
  });

  responseCache.set(prefix, request);
  return request;
};

export const getSponsorBlockSegments = async (bvid: string, cid: string) => {
  const prefix = await getSponsorBlockHashPrefix(bvid);
  const response = await fetchPrefixResponse(prefix);
  return normalizeSponsorBlockSegments(response, bvid, cid);
};

export const clearSponsorBlockCache = () => responseCache.clear();
