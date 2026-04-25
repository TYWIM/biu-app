import { describe, expect, test } from "vitest";

import { formatDuration, formatSecondsToDate, formatMillisecond } from "@/common/utils/time";

describe("formatDuration", () => {
  test("formats seconds under a minute", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(5)).toBe("00:05");
    expect(formatDuration(59)).toBe("00:59");
  });

  test("formats seconds under an hour", () => {
    expect(formatDuration(60)).toBe("01:00");
    expect(formatDuration(90)).toBe("01:30");
    expect(formatDuration(3599)).toBe("59:59");
  });

  test("formats seconds over an hour", () => {
    expect(formatDuration(3600)).toBe("01:00:00");
    expect(formatDuration(3661)).toBe("01:01:01");
    expect(formatDuration(7384)).toBe("02:03:04");
  });

  test("handles negative values using absolute value", () => {
    expect(formatDuration(-5)).toBe("00:05");
    expect(formatDuration(-3600)).toBe("01:00:00");
  });

  test("handles decimal values by flooring", () => {
    expect(formatDuration(90.7)).toBe("01:30");
    expect(formatDuration(0.9)).toBe("00:00");
  });
});

describe("formatSecondsToDate", () => {
  test("formats unix timestamp to date string", () => {
    const result = formatSecondsToDate(1700000000);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("returns empty string for undefined", () => {
    expect(formatSecondsToDate(undefined)).toBe("");
    expect(formatSecondsToDate(0)).toBe("");
  });
});

describe("formatMillisecond", () => {
  test("formats millisecond timestamp to date string", () => {
    const result = formatMillisecond(1700000000000);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("returns empty string for undefined", () => {
    expect(formatMillisecond(undefined)).toBe("");
    expect(formatMillisecond(0)).toBe("");
  });
});
