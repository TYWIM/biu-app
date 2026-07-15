type NetworkLikeError = {
  code?: string;
  response?: {
    status?: number;
  };
};

export const isDeviceOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

export const getNetworkErrorMessage = (error: unknown, fallback = "加载失败，请稍后重试") => {
  if (isDeviceOffline()) {
    return "当前处于离线状态，请检查网络连接";
  }

  const networkError = error as NetworkLikeError | undefined;
  const status = networkError?.response?.status;

  if (status === 429) {
    return "请求过于频繁，请稍后重试";
  }

  if (status && status >= 500) {
    return "服务暂时不可用，请稍后重试";
  }

  if (networkError?.code === "ECONNABORTED" || networkError?.code === "ETIMEDOUT") {
    return "请求超时，请重试";
  }

  if (networkError?.code === "ERR_NETWORK") {
    return "网络连接失败，请检查网络后重试";
  }

  return fallback;
};
