import { getLyric } from "@/service/ai-lyrics";
import { getWebPlayerInfo, type WebPlayerParams } from "@/service/web-player";

export interface BiliLyricsResult {
  lyrics: Array<{ time: number; text: string }>;
  translatedLyrics?: Array<{ time: number; text: string }>;
}

function parseBiliLyricBody(body?: Array<{ from?: number; content?: string }>) {
  return (
    body
      ?.map(item => {
        const raw = item.content ?? "";
        const cleaned = raw.replace(/^[♪♫]+|[♪♫]+$/g, "").trim();
        return {
          time: Math.max(0, Math.round((item.from ?? 0) * 1000)),
          text: cleaned,
        };
      })
      .filter(item => item.text)
      .toSorted((a, b) => a.time - b.time) ?? []
  );
}

export async function getLyricsByBili(params: WebPlayerParams): Promise<BiliLyricsResult | null> {
  const res = await getWebPlayerInfo(params);
  const subtitles = res?.data?.subtitle?.subtitles;

  if (!subtitles?.length) {
    return null;
  }

  // 查找原文字幕（优先非中文，其次默认第一个）
  // 翻译字幕优先找中文，且与原文不同
  const originalSub =
    subtitles.find(s => !s.lan?.startsWith("zh")) || subtitles[0];
  const translatedSub = subtitles.find(
    s => s.lan?.startsWith("zh") && s !== originalSub
  );

  if (!originalSub?.subtitle_url && !originalSub?.subtitle_url_v2) {
    return null;
  }

  const originalUrl = originalSub.subtitle_url_v2 || originalSub.subtitle_url;
  const [originalRes, translatedRes] = await Promise.all([
    getLyric(originalUrl),
    translatedSub?.subtitle_url_v2 || translatedSub?.subtitle_url
      ? getLyric(translatedSub.subtitle_url_v2 || translatedSub.subtitle_url!)
      : Promise.resolve(null),
  ]);

  const lyrics = parseBiliLyricBody(originalRes?.body);
  if (!lyrics.length) {
    return null;
  }

  const result: BiliLyricsResult = { lyrics };

  if (translatedRes?.body?.length) {
    result.translatedLyrics = parseBiliLyricBody(translatedRes.body);
  }

  return result;
}
