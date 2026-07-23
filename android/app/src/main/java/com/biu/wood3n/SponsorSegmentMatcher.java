package com.biu.wood3n;

import java.util.List;

final class SponsorSegmentMatcher {
    private static final long END_TOLERANCE_MS = 50L;

    private SponsorSegmentMatcher() {
    }

    static long findSkipEndMs(List<long[]> segments, long positionMs) {
        for (long[] segment : segments) {
            if (segment == null || segment.length < 2) {
                continue;
            }

            long startMs = segment[0];
            long endMs = segment[1];
            if (positionMs >= startMs && positionMs < endMs - END_TOLERANCE_MS) {
                return endMs;
            }
        }
        return -1L;
    }
}
