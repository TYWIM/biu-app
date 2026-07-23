import { describe, expect, test } from "vitest";

import {
  findSponsorBlockSkipTarget,
  getSponsorBlockHashPrefix,
  normalizeSponsorBlockSegments,
} from "@/service/sponsor-block";

describe("sponsor block", () => {
  test("uses the upstream SHA-256 video prefix", async () => {
    await expect(getSponsorBlockHashPrefix("BV14741127BN")).resolves.toBe("5759");
  });

  test("filters by video, cid, action and automatic categories", () => {
    const response = [
      {
        videoID: "BV-target",
        segments: [
          { cid: "1", category: "sponsor", actionType: "skip", segment: [10, 20] },
          { cid: "1", category: "padding", actionType: "skip", segment: [19.98, 25] },
          { cid: "1", category: "intro", actionType: "skip", segment: [30, 40] },
          { cid: "2", category: "sponsor", actionType: "skip", segment: [50, 60] },
          { cid: "1", category: "sponsor", actionType: "mute", segment: [70, 80] },
          { cid: "1", category: "sponsor", actionType: "skip", segment: [90, 100], hidden: 1 },
        ],
      },
      { videoID: "BV-other", segments: [{ cid: "1", category: "sponsor", actionType: "skip", segment: [1, 2] }] },
    ];

    expect(normalizeSponsorBlockSegments(response, "BV-target", "1")).toEqual([
      { start: 10, end: 25, category: "sponsor" },
    ]);
  });

  test("returns a skip target only while inside a segment", () => {
    const segments = [{ start: 10, end: 20, category: "sponsor" as const }];

    expect(findSponsorBlockSkipTarget(segments, 9.99)).toBeUndefined();
    expect(findSponsorBlockSkipTarget(segments, 10)).toBe(20);
    expect(findSponsorBlockSkipTarget(segments, 15)).toBe(20);
    expect(findSponsorBlockSkipTarget(segments, 19.98)).toBeUndefined();
    expect(findSponsorBlockSkipTarget(segments, 20)).toBeUndefined();
  });
});
