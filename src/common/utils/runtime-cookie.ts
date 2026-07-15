import { Capacitor, CapacitorCookies } from "@capacitor/core";

const DEFAULT_COOKIE_URL = "https://www.bilibili.com";

const COOKIE_URL_FALLBACKS = [
  DEFAULT_COOKIE_URL,
  "https://passport.bilibili.com",
  "https://api.bilibili.com",
  "https://m.bilibili.com",
];

const LOGIN_COOKIE_KEYS = ["SESSDATA", "bili_jct", "DedeUserID", "DedeUserID__ckMd5", "sid"];

const isNative = () => Capacitor.isNativePlatform();

const getNativeCookiesApi = () =>
  CapacitorCookies as unknown as {
    getCookies: (options: { url: string }) => Promise<Record<string, string>>;
    setCookie: (options: { url: string; key: string; value: string; expires?: string }) => Promise<void>;
    deleteCookie?: (options: { url: string; key: string }) => Promise<void>;
    clearCookies?: (options: { url: string }) => Promise<void>;
  };

const normalizeCookieValue = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().replace(/^"+|"+$/g, "");

  return normalized || undefined;
};

export const canUseRuntimeCookieApi = () => {
  return isNative();
};

export const getRuntimeCookie = async (name: string, url = DEFAULT_COOKIE_URL) => {
  if (isNative()) {
    const cookiesApi = getNativeCookiesApi();
    const urls = Array.from(new Set([url, ...COOKIE_URL_FALLBACKS]));

    for (const currentUrl of urls) {
      const cookies = await cookiesApi.getCookies({ url: currentUrl });
      const value = normalizeCookieValue(cookies[name]);

      if (value !== undefined) {
        return value;
      }
    }
  }

  return undefined;
};

export const setRuntimeCookie = async (
  name: string,
  value: string,
  expirationDate?: number,
  url = DEFAULT_COOKIE_URL,
) => {
  if (isNative()) {
    const cookiesApi = getNativeCookiesApi();
    const expires = expirationDate ? new Date(expirationDate * 1000).toUTCString() : undefined;
    await cookiesApi.setCookie({
      url,
      key: name,
      value,
      ...(expires ? { expires } : {}),
    });
  }
};

export const clearRuntimeLoginCookies = async (url = DEFAULT_COOKIE_URL) => {
  if (!isNative()) {
    return;
  }

  const cookiesApi = getNativeCookiesApi();
  const urls = Array.from(new Set([url, ...COOKIE_URL_FALLBACKS]));

  for (const currentUrl of urls) {
    if (typeof cookiesApi.deleteCookie === "function") {
      await Promise.allSettled(
        LOGIN_COOKIE_KEYS.map(key =>
          cookiesApi.deleteCookie?.({
            url: currentUrl,
            key,
          }),
        ),
      );
      continue;
    }

    if (typeof cookiesApi.clearCookies === "function") {
      await cookiesApi.clearCookies({ url: currentUrl });
    }
  }
};
