import type { AxiosError, AxiosRequestConfig, AxiosInstance } from "axios";

const DEFAULT_RETRY_COUNT = 2;
const DEFAULT_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 10000;

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

interface RetryAxiosRequestConfig extends AxiosRequestConfig {
  __retryCount?: number;
  __maxRetry?: number;
  __retryDelay?: number;
  __axiosInstance?: AxiosInstance;
}

const shouldRetry = (error: AxiosError<unknown>): boolean => {
  if (!error.config) return false;
  const config = error.config as RetryAxiosRequestConfig;
  const retryCount = config.__retryCount ?? 0;
  const maxRetry = config.__maxRetry ?? DEFAULT_RETRY_COUNT;
  if (retryCount >= maxRetry) return false;

  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT" || error.code === "ERR_NETWORK") {
    return true;
  }

  if (error.response && RETRYABLE_STATUS_CODES.has(error.response.status)) {
    return true;
  }

  return false;
};

const getRetryDelay = (error: AxiosError<unknown>): number => {
  if (error.response?.status === 429) {
    const retryAfter = error.response.headers?.["retry-after"];
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (Number.isFinite(seconds) && seconds > 0) {
        return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
      }
      const date = new Date(retryAfter);
      if (date.getTime() > Date.now()) {
        return Math.min(date.getTime() - Date.now(), MAX_RETRY_DELAY_MS);
      }
    }
  }

  const config = error.config as RetryAxiosRequestConfig;
  const retryCount = config.__retryCount ?? 0;
  const baseDelay = config.__retryDelay ?? DEFAULT_RETRY_DELAY_MS;
  const delay = baseDelay * Math.pow(2, retryCount);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
};

export const retryInterceptor = (error: AxiosError<unknown>): Promise<AxiosError<unknown>> => {
  if (!shouldRetry(error) || !error.config) {
    return Promise.reject(error);
  }

  const config = error.config as RetryAxiosRequestConfig;
  config.__retryCount = (config.__retryCount ?? 0) + 1;

  const delay = getRetryDelay(error);

  return new Promise((resolve) => setTimeout(resolve, delay)).then(() => {
    const axios = config.__axiosInstance;
    if (axios) {
      const requestConfig: AxiosRequestConfig = {
        url: config.url,
        method: config.method,
        headers: config.headers,
        data: config.data,
        params: config.params,
        timeout: config.timeout,
        responseType: config.responseType,
        withCredentials: config.withCredentials,
        auth: config.auth,
        baseURL: config.baseURL,
      };
      return axios(requestConfig);
    }
    return Promise.reject(error);
  });
};
