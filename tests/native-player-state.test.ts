import { describe, expect, test } from "vitest";

import { didPlaybackEnd } from "@/common/utils/native-player";

describe("native player state transitions", () => {
  test("emits ended only on the false-to-true transition", () => {
    expect(didPlaybackEnd(false, true)).toBe(true);
    expect(didPlaybackEnd(true, true)).toBe(false);
    expect(didPlaybackEnd(false, false)).toBe(false);
    expect(didPlaybackEnd(true, false)).toBe(false);
  });
});
