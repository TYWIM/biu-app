import { StoreNameMap } from "@shared/store";

import log from "@/common/utils/logger";

import { getRuntimeStore, setRuntimeStore } from "./runtime-store";

const CACHE_METADATA_KEY = StoreNameMap.MediaDownloads;

export interface CacheEntry {
  key: string;
  url: string;
  filePath?: string;
  size: number;
  lastAccessed: number;
  lastModified: number;
  contentType: "audio" | "video";
  bvid?: string;
  cid?: number;
  sid?: number;
  title: string;
  cover?: string;
}

interface CacheMetadata {
  entries: Record<string, CacheEntry>;
  totalSize: number;
  maxSize: number;
}

const DEFAULT_MAX_CACHE_SIZE = 500 * 1024 * 1024; // 500MB
const CACHE_EXPIRY_DAYS = 30;

async function getCacheMetadata(): Promise<CacheMetadata> {
  try {
    const store = await getRuntimeStore(CACHE_METADATA_KEY);
    if (store && typeof store === "object") {
      return {
        entries: (store.entries as Record<string, CacheEntry>) || {},
        totalSize: (store.totalSize as number) || 0,
        maxSize: (store.maxSize as number) || DEFAULT_MAX_CACHE_SIZE,
      };
    }
  } catch {
    // ignore
  }
  return {
    entries: {},
    totalSize: 0,
    maxSize: DEFAULT_MAX_CACHE_SIZE,
  };
}

async function setCacheMetadata(metadata: CacheMetadata): Promise<void> {
  try {
    await setRuntimeStore(CACHE_METADATA_KEY, metadata);
  } catch {
    // ignore
  }
}

export async function addCacheEntry(entry: CacheEntry): Promise<void> {
  const metadata = await getCacheMetadata();
  metadata.entries[entry.key] = entry;
  metadata.totalSize = Object.values(metadata.entries).reduce((sum, e) => sum + e.size, 0);
  await setCacheMetadata(metadata);
}

export async function getCacheEntry(key: string): Promise<CacheEntry | null> {
  const metadata = await getCacheMetadata();
  const entry = metadata.entries[key];
  if (!entry) return null;

  // Update last accessed
  entry.lastAccessed = Date.now();
  await setCacheMetadata(metadata);

  return entry;
}

export async function removeCacheEntry(key: string): Promise<void> {
  const metadata = await getCacheMetadata();
  if (metadata.entries[key]) {
    delete metadata.entries[key];
    metadata.totalSize = Object.values(metadata.entries).reduce((sum, e) => sum + e.size, 0);
    await setCacheMetadata(metadata);
  }
}

export async function getAllCacheEntries(): Promise<CacheEntry[]> {
  const metadata = await getCacheMetadata();
  return Object.values(metadata.entries).sort((a, b) => b.lastAccessed - a.lastAccessed);
}

export async function getCacheStats(): Promise<{ totalSize: number; maxSize: number; entryCount: number }> {
  const metadata = await getCacheMetadata();
  return {
    totalSize: metadata.totalSize,
    maxSize: metadata.maxSize,
    entryCount: Object.keys(metadata.entries).length,
  };
}

export async function setMaxCacheSize(maxSize: number): Promise<void> {
  const metadata = await getCacheMetadata();
  metadata.maxSize = maxSize;
  await setCacheMetadata(metadata);
}

/**
 * LRU cleanup: remove oldest entries until total size is under max size
 */
export async function cleanupLRU(): Promise<string[]> {
  const metadata = await getCacheMetadata();
  const removedKeys: string[] = [];

  const entries = Object.values(metadata.entries);
  if (entries.length === 0 || metadata.totalSize <= metadata.maxSize) {
    return removedKeys;
  }

  // Sort by last accessed (oldest first)
  entries.sort((a, b) => a.lastAccessed - b.lastAccessed);

  let currentSize = metadata.totalSize;
  for (const entry of entries) {
    if (currentSize <= metadata.maxSize) break;

    delete metadata.entries[entry.key];
    currentSize -= entry.size;
    removedKeys.push(entry.key);

    log.info(`[cache] LRU removed: ${entry.title} (${entry.size} bytes)`);
  }

  metadata.totalSize = currentSize;
  await setCacheMetadata(metadata);

  return removedKeys;
}

/**
 * Remove expired entries (not accessed for CACHE_EXPIRY_DAYS)
 */
export async function cleanupExpired(): Promise<string[]> {
  const metadata = await getCacheMetadata();
  const removedKeys: string[] = [];
  const now = Date.now();
  const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

  for (const [key, entry] of Object.entries(metadata.entries)) {
    if (now - entry.lastAccessed > expiryMs) {
      delete metadata.entries[key];
      removedKeys.push(key);
      log.info(`[cache] Expired removed: ${entry.title}`);
    }
  }

  metadata.totalSize = Object.values(metadata.entries).reduce((sum, e) => sum + e.size, 0);
  await setCacheMetadata(metadata);

  return removedKeys;
}

/**
 * Generate cache key from play item
 */
export function generateCacheKey(type: "audio" | "video", bvid?: string, cid?: number, sid?: number): string {
  if (type === "audio" && sid) {
    return `audio-${sid}`;
  }
  if (bvid && cid) {
    return `${type}-${bvid}-${cid}`;
  }
  return `${type}-${Date.now()}`;
}

/**
 * Check if a cached file is available
 */
export async function isCached(type: "audio" | "video", bvid?: string, cid?: number, sid?: number): Promise<boolean> {
  const key = generateCacheKey(type, bvid, cid, sid);
  const entry = await getCacheEntry(key);
  return entry !== null;
}
