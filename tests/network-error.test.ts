import { afterEach, describe, expect, it, vi } from "vitest";

import { getNetworkErrorMessage } from "@/common/utils/network-error";

describe("network error messages", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports an offline device before inspecting the request error", () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    expect(getNetworkErrorMessage({ code: "ERR_NETWORK" })).toBe("当前处于离线状态，请检查网络连接");
  });

  it("distinguishes timeout, rate limit and server failures", () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    expect(getNetworkErrorMessage({ code: "ETIMEDOUT" })).toBe("请求超时，请重试");
    expect(getNetworkErrorMessage({ response: { status: 429 } })).toBe("请求过于频繁，请稍后重试");
    expect(getNetworkErrorMessage({ response: { status: 503 } })).toBe("服务暂时不可用，请稍后重试");
  });
});
