package com.biu.wood3n;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

import java.util.Arrays;
import java.util.Collections;

public class SponsorSegmentMatcherTest {
    @Test
    public void returnsEndWhenPositionIsInsideSegment() {
        assertEquals(20_000L, SponsorSegmentMatcher.findSkipEndMs(
                Collections.singletonList(new long[]{10_000L, 20_000L}),
                12_000L
        ));
    }

    @Test
    public void ignoresPositionsOutsideSegmentsAndNearTheEnd() {
        assertEquals(-1L, SponsorSegmentMatcher.findSkipEndMs(
                Arrays.asList(new long[]{10_000L, 20_000L}, new long[]{30_000L, 40_000L}),
                20_000L
        ));
        assertEquals(-1L, SponsorSegmentMatcher.findSkipEndMs(
                Collections.singletonList(new long[]{10_000L, 20_000L}),
                19_975L
        ));
    }
}
