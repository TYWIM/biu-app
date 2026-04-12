import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { Capacitor, CapacitorHttp } from "@capacitor/core";

/**
 * Returns true when we should use the native HTTP adapter (Android only).
 */
export const shouldUseNativeHttp = () => Capacitor.isNativePlatform();

/**
 * Axios adapter that routes requests through the built-in CapacitorHttp API
 * on Android/iOS, bypassing WebView XHR forbidden-header restrictions
 * (Referer, User-Agent, etc.).
 */
export const nativeHttpAdapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  // Build the full URL
  let url = config.url || "";
  if (config.baseURL && !url.startsWith("http")) {
    url = config.baseURL.replace(/\/+$/, "") + "/" + url.replace(/^\/+/, "");
  }

  // Build headers – CapacitorHttp sends these natively, no forbidden-header filtering
  const headers: Record<string, string> = {};
  if (config.headers) {
    const raw = typeof config.headers.toJSON === "function" ? config.headers.toJSON() : config.headers;
    for (const [key, value] of Object.entries(raw)) {
      if (value !== undefined && value !== null && typeof value !== "boolean") {
        headers[key] = String(value);
      }
    }
  }

  // Prepare data
  let data: any = undefined;
  if (config.data !== undefined && config.data !== null) {
    if (config.data instanceof FormData) {
      const parts: string[] = [];
      config.data.forEach((value, key) => {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      });
      data = parts.join("&");
      if (!headers["Content-Type"] && !headers["content-type"]) {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
      }
    } else {
      data = config.data;
    }
  }

  // Build params record
  let params: Record<string, string> | undefined;
  if (config.params) {
    params = {};
    for (const [key, value] of Object.entries(config.params)) {
      if (value !== undefined && value !== null) {
        params[key] = String(value);
      }
    }
  }

  const method = (config.method || "GET").toUpperCase();

  const nativeResponse = await CapacitorHttp.request({
    url,
    method,
    headers,
    data,
    params,
    responseType: config.responseType === "text" ? "text" : "json",
    connectTimeout: config.timeout,
    readTimeout: config.timeout,
    webFetchExtra: { credentials: "include" },
  });

  const response: AxiosResponse = {
    data: nativeResponse.data,
    status: nativeResponse.status,
    statusText: "",
    headers: nativeResponse.headers || {},
    config: config as InternalAxiosRequestConfig,
    request: {},
  };

  // Reject on non-2xx unless validateStatus says otherwise
  const validateStatus = config.validateStatus || ((s: number) => s >= 200 && s < 300);
  if (!validateStatus(nativeResponse.status)) {
    const error = new Error(`Request failed with status code ${nativeResponse.status}`) as any;
    error.response = response;
    error.config = config;
    error.isAxiosError = true;
    throw error;
  }

  return response;
};
