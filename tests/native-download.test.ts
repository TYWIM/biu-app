import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAudioUrl, getDashUrl } from "@/common/utils/audio";
import { resolveDownloadUrl } from "@/common/utils/native-download";
import { getPlayerPlayurl } from "@/service/player-playurl";
import { getWebInterfaceView } from "@/service/web-interface-view";

vi.mock("@/common/utils/audio", () => ({
  getAudioUrl: vi.fn(),
  getDashUrl: vi.fn(),
}));

vi.mock("@/service/player-playurl", () => ({
  getPlayerPlayurl: vi.fn(),
}));

vi.mock("@/service/web-interface-view", () => ({
  getWebInterfaceView: vi.fn(),
}));

describe("resolveDownloadUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses an explicit URL without resolving media metadata", async () => {
    await expect(
      resolveDownloadUrl({ outputFileType: "audio", title: "test", url: "https://media.test/a.m4a" }),
    ).resolves.toBe("https://media.test/a.m4a");

    expect(getAudioUrl).not.toHaveBeenCalled();
    expect(getDashUrl).not.toHaveBeenCalled();
  });

  it("resolves an audio-zone song by sid", async () => {
    vi.mocked(getAudioUrl).mockResolvedValue({
      audioUrl: "https://media.test/song.m4a",
      audioCodecs: "",
      isLossless: false,
    });

    await expect(resolveDownloadUrl({ outputFileType: "audio", title: "song", sid: 42 })).resolves.toBe(
      "https://media.test/song.m4a",
    );
    expect(getAudioUrl).toHaveBeenCalledWith(42);
  });

  it("loads the first cid before resolving a video audio track", async () => {
    vi.mocked(getWebInterfaceView).mockResolvedValue({ data: { pages: [{ cid: 99 }] } } as never);
    vi.mocked(getDashUrl).mockResolvedValue({
      audioBandwidth: 128000,
      audioCodecs: "mp4a.40.2",
      audioUrl: "https://media.test/video-audio.m4a",
      isLossless: false,
      videoResolution: "1920x1080",
      videoUrl: undefined,
    });

    await expect(resolveDownloadUrl({ outputFileType: "audio", title: "video", bvid: "BV1TEST" })).resolves.toBe(
      "https://media.test/video-audio.m4a",
    );
    expect(getDashUrl).toHaveBeenCalledWith("BV1TEST", 99);
  });

  it("uses a progressive MP4 stream for video downloads", async () => {
    vi.mocked(getPlayerPlayurl).mockResolvedValue({
      data: { durl: [{ url: "https://media.test/video.mp4" }] },
    } as never);

    await expect(
      resolveDownloadUrl({ outputFileType: "video", title: "video", bvid: "BV1TEST", cid: 7 }),
    ).resolves.toBe("https://media.test/video.mp4");
  });

  it("rejects segmented video streams instead of downloading an incomplete file", async () => {
    vi.mocked(getPlayerPlayurl).mockResolvedValue({
      data: {
        durl: [{ url: "https://media.test/part-1.mp4" }, { url: "https://media.test/part-2.mp4" }],
      },
    } as never);

    await expect(
      resolveDownloadUrl({ outputFileType: "video", title: "video", bvid: "BV1TEST", cid: 7 }),
    ).rejects.toThrow("暂不支持分段视频下载");
  });
});
