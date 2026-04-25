import axios, { type AxiosRequestConfig, type CreateAxiosDefaults } from "axios";

import { nativeHttpAdapter, shouldUseNativeHttp } from "@/common/utils/native-http-adapter";

import { requestInterceptors } from "./request-interceptors";
import { retryInterceptor } from "./retry-interceptor";
import { geetestInterceptors } from "./response-interceptors";

const BILIBILI_REFERER = "https://www.bilibili.com";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const useNative = shouldUseNativeHttp();

const axiosConfig: CreateAxiosDefaults = {
  timeout: 10000,
  withCredentials: true,
  headers: {
    Referer: BILIBILI_REFERER,
    "User-Agent": BROWSER_UA,
  },
  ...(useNative ? { adapter: nativeHttpAdapter as any } : {}),
};

export const axiosInstance = axios.create(axiosConfig);

export const searchRequest = axios.create({
  ...axiosConfig,
  baseURL: "https://s.search.bilibili.com",
});

export const biliRequest = axios.create({
  ...axiosConfig,
  baseURL: "https://www.bilibili.com",
});

export const memberRequest = axios.create({
  ...axiosConfig,
  baseURL: "https://member.bilibili.com",
});

export const apiRequest = axios.create({
  ...axiosConfig,
  baseURL: "https://api.bilibili.com",
});

export const passportRequest = axios.create({
  ...axiosConfig,
  baseURL: "https://passport.bilibili.com",
});

const allInstances = [axiosInstance, searchRequest, biliRequest, memberRequest, apiRequest, passportRequest];

for (const instance of allInstances) {
  instance.interceptors.request.use((config) => {
    (config as AxiosRequestConfig & { __axiosInstance?: typeof instance }).__axiosInstance = instance;
    return config;
  });
}

apiRequest.interceptors.request.use(requestInterceptors);
passportRequest.interceptors.request.use(requestInterceptors);
searchRequest.interceptors.request.use(requestInterceptors);
memberRequest.interceptors.request.use(requestInterceptors);

apiRequest.interceptors.response.use(geetestInterceptors);

axiosInstance.interceptors.response.use(res => res.data);
biliRequest.interceptors.response.use(res => res.data);
apiRequest.interceptors.response.use(res => res.data);
passportRequest.interceptors.response.use(res => res.data);
searchRequest.interceptors.response.use(res => res.data);
memberRequest.interceptors.response.use(res => res.data);

for (const instance of allInstances) {
  instance.interceptors.response.use(undefined, retryInterceptor);
}
