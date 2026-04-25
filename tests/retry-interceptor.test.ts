import { describe, expect, it, vi } from "vitest";
import type { AxiosError, AxiosInstance } from "axios";
import { retryInterceptor } from "@/service/request/retry-interceptor";

const createAxiosError = (overrides: Partial<AxiosError> = {}): AxiosError => {
  const error = new Error("Request failed") as AxiosError;
  const overrideConfig = (overrides as any).config || {};
  (error as any).config = {
    url: "/test",
    method: "get",
    headers: {},
    ...overrideConfig,
  };
  (error as any).response = {
    status: 500,
    data: {},
    headers: {},
    statusText: "Internal Server Error",
    config: (error as any).config,
  };
  error.code = undefined;
  // 手动合并 overrides，避免 Object.assign 覆盖已构建好的 config
  for (const key of Object.keys(overrides)) {
    if (key === "config") continue;
    (error as any)[key] = (overrides as any)[key];
  }
  return error;
};

const createMockAxios = (result: any = { data: "ok" }): AxiosInstance => {
  const fn = vi.fn().mockResolvedValue(result);
  return fn as unknown as AxiosInstance;
};

describe("retryInterceptor", () => {
  it("should reject immediately if no config", async () => {
    const error = createAxiosError({ config: undefined });
    await expect(retryInterceptor(error)).rejects.toBe(error);
  });

  it("should reject when retry count exceeds max", async () => {
    const error = createAxiosError({
      config: { __retryCount: 2, __maxRetry: 2 },
    } as any);
    await expect(retryInterceptor(error)).rejects.toBe(error);
  });

  it("should retry on ECONNABORTED and call axios", async () => {
    const mockAxios = createMockAxios();
    const error = createAxiosError({
      code: "ECONNABORTED",
      config: { __axiosInstance: mockAxios },
    } as any);

    const result = await retryInterceptor(error);
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(mockAxios).toHaveBeenCalledWith(expect.objectContaining({ url: "/test", method: "get" }));
    expect(result).toEqual({ data: "ok" });
  });

  it("should retry on ERR_NETWORK", async () => {
    const mockAxios = createMockAxios();
    const error = createAxiosError({
      code: "ERR_NETWORK",
      config: { __axiosInstance: mockAxios },
    } as any);

    const result = await retryInterceptor(error);
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: "ok" });
  });

  it("should retry on 429 with exponential backoff", async () => {
    const mockAxios = createMockAxios();
    const error = createAxiosError({
      response: {
        status: 429,
        data: {},
        headers: {},
        statusText: "Too Many Requests",
        config: { url: "/test", method: "get", headers: {} },
      },
      config: {
        __axiosInstance: mockAxios,
        __retryCount: 0,
        __retryDelay: 1000,
      },
    } as any);

    const result = await retryInterceptor(error);
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: "ok" });
  });

  it("should retry on 503", async () => {
    const mockAxios = createMockAxios();
    const error = createAxiosError({
      response: {
        status: 503,
        data: {},
        headers: {},
        statusText: "Service Unavailable",
        config: { url: "/test", method: "get", headers: {} },
      },
      config: {
        __axiosInstance: mockAxios,
      },
    } as any);

    const result = await retryInterceptor(error);
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: "ok" });
  });

  it("should not retry on 404", async () => {
    const error = createAxiosError({
      response: {
        status: 404,
        data: {},
        headers: {},
        statusText: "Not Found",
        config: { url: "/test", method: "get", headers: {} },
      },
    } as any);

    await expect(retryInterceptor(error)).rejects.toBe(error);
  });

  it("should respect Retry-After header for 429", async () => {
    const mockAxios = createMockAxios();
    const error = createAxiosError({
      response: {
        status: 429,
        data: {},
        headers: { "retry-after": "2" },
        statusText: "Too Many Requests",
        config: { url: "/test", method: "get", headers: {} },
      },
      config: {
        __axiosInstance: mockAxios,
      },
    } as any);

    const start = Date.now();
    const result = await retryInterceptor(error);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(2000);
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: "ok" });
  });

  it("should cap retry delay at MAX_RETRY_DELAY_MS", async () => {
    const mockAxios = createMockAxios();
    const error = createAxiosError({
      code: "ECONNABORTED",
      config: {
        __axiosInstance: mockAxios,
        __retryCount: 10,
        __retryDelay: 100000,
      },
    } as any);

    await expect(retryInterceptor(error)).rejects.toBe(error);
    expect(mockAxios).not.toHaveBeenCalled();
  });

  it("should use exponential backoff: delay = base * 2^retryCount", async () => {
    const mockAxios = createMockAxios();
    const error = createAxiosError({
      code: "ECONNABORTED",
      config: {
        __axiosInstance: mockAxios,
        __retryCount: 1,
        __retryDelay: 1000,
      },
    } as any);

    const start = Date.now();
    const result = await retryInterceptor(error);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(2000);
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: "ok" });
  });
});
