import { describe, expect, test } from "vitest";

import { getUrlParams, formatUrlProtocol } from "@/common/utils/url";

describe("getUrlParams", () => {
  test("parses query parameters from full URL", () => {
    const result = getUrlParams("https://example.com/path?key1=value1&key2=value2");
    expect(result).toEqual({ key1: "value1", key2: "value2" });
  });

  test("parses query parameters from relative URL", () => {
    const result = getUrlParams("/path?foo=bar");
    expect(result).toEqual({ foo: "bar" });
  });

  test("returns empty object for URL without query string", () => {
    expect(getUrlParams("https://example.com/path")).toEqual({});
    expect(getUrlParams("/path")).toEqual({});
  });

  test("returns empty object for empty string", () => {
    expect(getUrlParams("")).toEqual({});
  });

  test("handles URL with only question mark", () => {
    expect(getUrlParams("https://example.com?")).toEqual({});
  });

  test("handles duplicate keys by keeping last value", () => {
    const result = getUrlParams("https://example.com?key=1&key=2");
    expect(result.key).toBe("2");
  });

  test("handles special characters in values", () => {
    const result = getUrlParams("https://example.com?q=hello+world&enc=%E4%B8%AD");
    expect(result.q).toBe("hello world");
    expect(result.enc).toBe("中");
  });

  test("handles malformed URL by parsing whatever query string exists", () => {
    const result = getUrlParams("not a url ? invalid");
    expect(result).toHaveProperty(" invalid");
  });
});

describe("formatUrlProtocol", () => {
  test("converts http to https", () => {
    expect(formatUrlProtocol("http://example.com/path")).toBe("https://example.com/path");
  });

  test("keeps https unchanged", () => {
    expect(formatUrlProtocol("https://example.com/path")).toBe("https://example.com/path");
  });

  test("prepends https: to protocol-relative URL", () => {
    expect(formatUrlProtocol("//example.com/path")).toBe("https://example.com/path");
  });

  test("returns undefined for undefined input", () => {
    expect(formatUrlProtocol(undefined)).toBeUndefined();
  });

  test("returns empty string for empty string input", () => {
    expect(formatUrlProtocol("")).toBe("");
  });
});
