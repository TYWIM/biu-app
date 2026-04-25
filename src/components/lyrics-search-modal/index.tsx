import { useCallback, useEffect, useRef, useState } from "react";

import { Button, Input, Modal, ModalBody, ModalContent, ModalHeader, Tab, Tabs, addToast } from "@heroui/react";

import {
  canGetNeteaseLyrics,
  canSearchLrclibLyrics,
  canSearchNeteaseLyrics,
  getNeteaseLyricsRuntime,
  searchLrclibLyricsRuntime,
  searchNeteaseSongsRuntime,
} from "@/common/utils/runtime-lyrics";
import { getUnsupportedFeatureMessage } from "@/common/utils/runtime-platform";
import { canUseRuntimeStore, getRuntimeStore, setRuntimeStore } from "@/common/utils/runtime-store";
import { usePlayList } from "@/store/play-list";
import { StoreNameMap } from "@shared/store";

import type { AdoptLyricsHandler } from "./netease-tab";

import LrclibTab from "./lrclib-tab";
import NeteaseTab from "./netease-tab";

const NETEASE_TYPE_SONG = 1;
const DEFAULT_LIMIT = 20;

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onLyricsAdopted?: (lyricsText?: string, tLyricsText?: string) => void;
}

const LyricsSearchModal = ({ isOpen, onOpenChange, onLyricsAdopted }: Props) => {
  const playId = usePlayList(state => state.playId);
  const getPlayItem = usePlayList(state => state.getPlayItem);
  const canSearchNetease = canSearchNeteaseLyrics();
  const canSearchLrclib = canSearchLrclibLyrics();
  const canPreviewNetease = canGetNeteaseLyrics();
  const canPersistLyrics = canUseRuntimeStore();
  const [keyword, setKeyword] = useState("");
  const [activeTab, setActiveTab] = useState<"netease" | "lrclib">("netease");
  const [neteaseSongs, setNeteaseSongs] = useState<NeteaseSong[]>([]);
  const [lrclibSongs, setLrclibSongs] = useState<SearchSongByLrclibResponse[]>([]);
  const [neteaseLoading, setNeteaseLoading] = useState(false);
  const [lrclibLoading, setLrclibLoading] = useState(false);
  const keywordRef = useRef("");

  const resetState = useCallback(() => {
    setKeyword("");
    setActiveTab("netease");
    setNeteaseSongs([]);
    setLrclibSongs([]);
    setNeteaseLoading(false);
    setLrclibLoading(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const playItem = getPlayItem();
    if (playItem) {
      setKeyword(playItem.pageTitle || playItem.title);
      setNeteaseSongs([]);
      setLrclibSongs([]);
    }
  }, [playId, isOpen, getPlayItem]);

  useEffect(() => {
    keywordRef.current = keyword;
  }, [keyword]);

  const handleSubmit = useCallback(
    async (tab: "netease" | "lrclib" = activeTab) => {
      const query = keywordRef.current.trim();
      if (query === "") return;

      if (tab === "netease") {
        if (!canSearchNetease) {
          setNeteaseSongs([]);
          setNeteaseLoading(false);
          return;
        }

        setLrclibLoading(false);
        try {
          setNeteaseLoading(true);
          const res = await searchNeteaseSongsRuntime({
            s: query,
            type: NETEASE_TYPE_SONG,
            limit: DEFAULT_LIMIT,
            offset: 0,
          });

          setNeteaseSongs(res?.result?.songs ?? []);
        } catch {
          setNeteaseSongs([]);
          addToast({ title: "网易云搜索失败", color: "danger" });
        } finally {
          setNeteaseLoading(false);
        }
      } else {
        if (!canSearchLrclib) {
          setLrclibSongs([]);
          setLrclibLoading(false);
          return;
        }

        setNeteaseLoading(false);
        try {
          setLrclibLoading(true);

          // 尝试解析 "歌曲名 - 歌手" 或 "歌曲名 歌手" 格式
          const separators = [" - ", " — ", " – ", " -", "- "];
          let trackName = query;
          let artistName: string | undefined;

          for (const sep of separators) {
            const idx = query.indexOf(sep);
            if (idx > 0) {
              trackName = query.slice(0, idx).trim();
              artistName = query.slice(idx + sep.length).trim();
              break;
            }
          }

          // 如果没有分隔符，尝试用空格分割（最后一部分可能是歌手）
          if (!artistName && query.includes(" ")) {
            const parts = query.split(/\s+/);
            if (parts.length >= 2) {
              trackName = parts.slice(0, -1).join(" ");
              artistName = parts[parts.length - 1];
            }
          }

          const res = await searchLrclibLyricsRuntime({
            q: query,
            track_name: trackName !== query ? trackName : undefined,
            artist_name: artistName,
          });

          // 按匹配度排序：优先显示有同步歌词、时长接近的结果
          const playItem = getPlayItem();
          const targetDuration = playItem?.duration;

          const sorted = (res ?? []).sort((a, b) => {
            let scoreA = 0;
            let scoreB = 0;

            // 有同步歌词优先
            if (a.syncedLyrics) scoreA += 10;
            if (b.syncedLyrics) scoreB += 10;

            // 时长接近优先（±10秒内）
            if (targetDuration && a.duration) {
              const diffA = Math.abs(a.duration - targetDuration);
              if (diffA < 10) scoreA += 5;
              else if (diffA < 30) scoreA += 2;
            }
            if (targetDuration && b.duration) {
              const diffB = Math.abs(b.duration - targetDuration);
              if (diffB < 10) scoreB += 5;
              else if (diffB < 30) scoreB += 2;
            }

            return scoreB - scoreA;
          });

          setLrclibSongs(sorted);
        } catch {
          setLrclibSongs([]);
          addToast({ title: "LrcLib 搜索失败", color: "danger" });
        } finally {
          setLrclibLoading(false);
        }
      }
    },
    [activeTab, canSearchLrclib, canSearchNetease, getPlayItem],
  );

  useEffect(() => {
    if (isOpen) {
      void handleSubmit(activeTab);
    }
  }, [isOpen, activeTab, handleSubmit]);

  const handleAdoptLyrics = useCallback<AdoptLyricsHandler>(
    async (lyricsText, tLyricsText) => {
      if (!lyricsText && !tLyricsText) return false;

      const current = getPlayItem();
      const cid = current?.cid ? Number(current.cid) : undefined;

      if (!current?.bvid || cid === undefined || Number.isNaN(cid)) {
        addToast({ title: "当前播放信息缺失，无法保存歌词", color: "warning" });
        return false;
      }

      const nextLyrics: MusicLyrics = {
        lyrics: lyricsText,
        tLyrics: tLyricsText,
      };

      if (!canPersistLyrics) {
        onLyricsAdopted?.(lyricsText, tLyricsText);
        return true;
      }

      try {
        const store = await getRuntimeStore(StoreNameMap.LyricsCache);
        const key = `${current.bvid}-${current.cid}`;
        const prev = store?.[key] || {};
        const nextStore = { ...(store ?? {}), [key]: { ...prev, ...nextLyrics } };
        await setRuntimeStore(StoreNameMap.LyricsCache, nextStore);
        onLyricsAdopted?.(lyricsText, tLyricsText);
        return true;
      } catch {
        addToast({ title: "歌词保存失败", color: "danger" });
        return false;
      }
    },
    [canPersistLyrics, getPlayItem, onLyricsAdopted],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      onOpenChange(open);
      if (!open) {
        resetState();
      }
    },
    [onOpenChange, resetState],
  );

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange} scrollBehavior="inside" size="4xl" disableAnimation>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">搜索歌词</ModalHeader>
        <ModalBody className="pb-6">
          {!canSearchNetease && !canSearchLrclib && (
            <div className="text-default-500 text-sm">{getUnsupportedFeatureMessage("在线歌词搜索")}</div>
          )}
          <div className="flex gap-2">
            <Input
              value={keyword}
              onValueChange={setKeyword}
              placeholder="请输入歌曲或歌手名称"
              onKeyDown={e => {
                if (e.key === "Enter") handleSubmit(activeTab);
              }}
            />
            <Button color="primary" onPress={() => handleSubmit(activeTab)} isDisabled={!canSearchNetease && !canSearchLrclib}>
              搜索
            </Button>
          </div>
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={key => {
              const nextTab = key as "netease" | "lrclib";
              setActiveTab(nextTab);
              setNeteaseLoading(false);
              setLrclibLoading(false);
              setNeteaseSongs([]);
              setLrclibSongs([]);
            }}
            classNames={{
              panel: "py-0",
            }}
          >
            <Tab key="netease" title="网易云" />
            <Tab key="lrclib" title="LrcLib" />
          </Tabs>
          {activeTab === "netease" ? (
            <NeteaseTab
              songs={neteaseSongs}
              loading={neteaseLoading}
              onAdoptLyrics={handleAdoptLyrics}
              canPreviewLyrics={canPreviewNetease}
              getLyrics={getNeteaseLyricsRuntime}
            />
          ) : (
            <LrclibTab songs={lrclibSongs} loading={lrclibLoading} onAdoptLyrics={handleAdoptLyrics} />
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default LyricsSearchModal;
