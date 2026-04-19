import React, { useCallback, useEffect, useRef, useState } from "react";

import { addToast, Spinner, Tab, Tabs } from "@heroui/react";
import { RiPlayFill } from "@remixicon/react";

import useIsMobile from "@/common/hooks/use-is-mobile";
import { isBrowserPreview as checkIsBrowserPreview } from "@/common/utils/runtime-platform";
import { openBiliVideoLink } from "@/common/utils/url";
import AsyncButton from "@/components/async-button";
import Empty from "@/components/empty";
import ScrollContainer, { type ScrollRefObject } from "@/components/scroll-container";
import { getMusicComprehensiveWebRank, type Data as MusicItem } from "@/service/music-comprehensive-web-rank";
import { getRegionFeedRcmd, type Archive } from "@/service/web-interface-region-feed-rcmd";
import { useModalStore } from "@/store/modal";
import { usePlayList } from "@/store/play-list";
import { useSettings } from "@/store/settings";

import type { RecommendItem } from "./types";

import MusicRecommendGridList from "./grid-list";
import MusicRecommendList from "./list";
import NewMusicTop from "./new-music-top";

const PAGE_SIZE = 20;
const REGION_PAGE_SIZE = 15;
const REGION_WEB_LOCATION = "333.40138";

type RecommendTabKey = "music" | "guichu" | "pop";

const REGION_MAP: Record<Exclude<RecommendTabKey, "pop">, number> = {
  music: 1003,
  guichu: 1007,
};

const normalizeRankItem = (item: MusicItem): RecommendItem => {
  const archive = item.related_archive;
  return {
    id: item.id,
    aid: Number(item.aid) || undefined,
    bvid: archive?.bvid || item.bvid,
    title: archive?.title || item.music_title,
    cover: archive?.cover || item.cover,
    author: archive?.username || item.author,
    authorMid: archive?.uid,
    playCount: archive?.vv_count,
    duration: archive?.duration,
  };
};

const normalizeRegionItem = (item: Archive, fallbackId: string | number): RecommendItem => {
  return {
    id: item.aid ?? item.bvid ?? item.trackid ?? fallbackId,
    aid: item.aid,
    bvid: item.bvid,
    title: item.title || "",
    cover: item.cover,
    author: item.author?.name,
    authorMid: item.author?.mid,
    playCount: item.stat?.view,
    duration: item.duration,
  };
};

const MusicRecommend = () => {
  const scrollerRef = useRef<ScrollRefObject>(null);
  const isMobile = useIsMobile();
  const isBrowserPreview = checkIsBrowserPreview();
  const addMediaDownloadTask = typeof window !== "undefined" ? window.electron?.addMediaDownloadTask : undefined;
  const canDownload = Boolean(addMediaDownloadTask);

  const [list, setList] = useState<RecommendItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const pageRef = useRef(1);
  const [activeTab, setActiveTab] = useState<RecommendTabKey>("music");
  const scrollRestoreRef = useRef<{ tab: RecommendTabKey; top: number } | null>(null);
  const [popLayoutVersion, setPopLayoutVersion] = useState(0);

  const displayMode = useSettings(state => state.displayMode);
  const shouldUseGrid = isMobile || displayMode === "card";
  const listKey = `${activeTab}-${shouldUseGrid ? "card" : displayMode}-${activeTab === "pop" ? popLayoutVersion : 0}`;

  const getScrollElement = useCallback(() => {
    return (scrollerRef.current?.osInstance()?.elements().viewport as HTMLElement | null) ?? null;
  }, []);

  const handlePopLayoutChange = useCallback(() => {
    setPopLayoutVersion(prev => prev + 1);
  }, []);

  const fetchPage = useCallback(
    async (pn: number = 1) => {
      try {
        if (activeTab === "pop") {
          const res = await getMusicComprehensiveWebRank({ pn, ps: PAGE_SIZE, web_location: "333.1351" });
          const items = res?.data?.list ?? [];
          if (res.code === 0) {
            const normalized = items.map(normalizeRankItem);
            setList(prev => (pn === 1 ? normalized : [...prev, ...normalized]));
            setHasMore(items.length === PAGE_SIZE);
            if (pn === 1) {
              setLoadFailed(false);
            }
          } else {
            if (pn === 1) {
              setList([]);
              setLoadFailed(true);
            }
            setHasMore(false);
          }
          return;
        }

        const res = await getRegionFeedRcmd({
          display_id: pn,
          request_cnt: REGION_PAGE_SIZE,
          from_region: REGION_MAP[activeTab],
          device: "web",
          plat: 30,
          web_location: REGION_WEB_LOCATION,
        });
        const items = res?.data?.archives ?? [];
        if (res.code === 0) {
          const normalized = items.map((item, index) => normalizeRegionItem(item, `${pn}-${index}`));
          setList(prev => (pn === 1 ? normalized : [...prev, ...normalized]));
          setHasMore(items.length === REGION_PAGE_SIZE);
          if (pn === 1) {
            setLoadFailed(false);
          }
        } else {
          if (pn === 1) {
            setList([]);
            setLoadFailed(true);
          }
          setHasMore(false);
        }
      } catch {
        if (pn === 1) {
          setList([]);
          setLoadFailed(true);
        }
        setHasMore(false);
      }
    },
    [activeTab],
  );

  const loadMore = async () => {
    if (initialLoading || loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      pageRef.current += 1;
      await fetchPage(pageRef.current);
    } finally {
      setLoadingMore(false);
    }
  };

  const init = useCallback(async () => {
    try {
      pageRef.current = 1;
      setHasMore(true);
      setLoadingMore(false);
      setLoadFailed(false);
      await fetchPage(1);
    } finally {
      setInitialLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    setInitialLoading(true);
    init();
  }, [activeTab, init]);

  useEffect(() => {
    if (initialLoading) return;
    const restore = scrollRestoreRef.current;
    if (!restore || restore.tab !== activeTab) return;
    const viewport = getScrollElement();
    if (!viewport) return;
    const top = restore.top;
    requestAnimationFrame(() => {
      viewport.scrollTop = top;
      scrollRestoreRef.current = null;
    });
  }, [activeTab, getScrollElement, initialLoading, list.length]);

  const handlePlayAll = useCallback(async () => {
    const items = list
      .map(item => {
        return {
          type: "mv" as const,
          bvid: item.bvid,
          title: item.title,
          cover: item.cover,
          ownerName: item.author,
          ownerMid: item.authorMid,
        };
      })
      .filter(item => Boolean(item.bvid));

    if (!items.length) {
      addToast({ title: "暂无可播放内容", color: "warning" });
      return;
    }

    await usePlayList.getState().addList(items);
    addToast({ title: `已添加 ${items.length} 首到播放列表`, color: "success" });
  }, [list]);

  const handleMenuAction = useCallback(
    async (key: string, item: RecommendItem) => {
      if (!item.bvid && key !== "favorite") {
        addToast({ title: "暂无可播放内容", color: "warning" });
        return;
      }
      switch (key) {
        case "favorite":
          if (!item.aid) {
            addToast({ title: "该项目无法收藏", color: "warning" });
            return;
          }
          useModalStore.getState().onOpenFavSelectModal({
            rid: Number(item.aid),
            type: 2,
            title: item.title,
          });
          break;
        case "play-next":
          usePlayList.getState().addToNext({
            type: "mv",
            title: item.title,
            cover: item.cover,
            bvid: item.bvid,
            sid: Number(item.id) || undefined,
            ownerName: item.author,
          });
          break;
        case "add-to-playlist":
          usePlayList.getState().addList([
            {
              type: "mv",
              title: item.title,
              cover: item.cover,
              bvid: item.bvid,
              sid: Number(item.id) || undefined,
              ownerName: item.author,
            },
          ]);
          break;
        case "download-audio":
          {
            const downloadTask = addMediaDownloadTask;
            if (!downloadTask) {
              addToast({ title: "浏览器预览模式不支持下载", color: "default" });
              return;
            }

            await downloadTask({
              outputFileType: "audio",
              title: item.title,
              cover: item.cover,
              bvid: item.bvid,
            });
            addToast({
              title: "已添加下载任务",
              color: "success",
            });
          }
          break;
        case "download-video": {
          const downloadTask = addMediaDownloadTask;
          if (!downloadTask) {
            addToast({ title: "浏览器预览模式不支持下载", color: "default" });
            return;
          }

          await downloadTask({
            outputFileType: "video",
            title: item.title,
            cover: item.cover,
            bvid: item.bvid,
          });
          addToast({
            title: "已添加下载任务",
            color: "success",
          });
          break;
        }
        case "bililink":
          if (item.bvid) {
            openBiliVideoLink({ type: "mv", bvid: item.bvid });
          }
          break;
        default:
          break;
      }
    },
    [addMediaDownloadTask],
  );

  return (
    <ScrollContainer
      enableBackToTop
      ref={scrollerRef}
      className={isMobile ? "h-full w-full px-4 py-4" : "h-full w-full px-4"}
    >
      {isMobile && (
        <div className="mb-4 rounded-[24px] border border-white/8 bg-white/[0.04] px-4 py-4 shadow-[0_18px_40px_rgb(2_6_23_/_0.08)] backdrop-blur-xl">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-primary mb-1 text-[10px] font-medium tracking-[0.28em] uppercase">Recommend</div>
              <div className="text-foreground text-[28px] leading-none font-semibold tracking-tight">发现</div>
              <div className="text-foreground-500 mt-2 text-sm">按分区浏览内容，并一键加入当前播放队列</div>
            </div>
            <AsyncButton
              color="primary"
              size="sm"
              radius="full"
              startContent={<RiPlayFill size={18} />}
              isDisabled={initialLoading || list.length === 0}
              onPress={handlePlayAll}
              className="shrink-0 px-4 dark:text-black"
            >
              全部播放
            </AsyncButton>
          </div>
        </div>
      )}
      <div className={isMobile ? "mb-3 flex flex-col gap-3" : "mb-2 flex items-center justify-between"}>
        <Tabs
          variant="solid"
          size={isMobile ? "sm" : "lg"}
          radius="md"
          className={isMobile ? "w-full" : undefined}
          classNames={{
            cursor: isMobile ? "rounded-full shadow-lg" : "rounded-medium",
            tabList: isMobile
              ? "max-w-full gap-1 overflow-x-auto rounded-full bg-white/[0.05] p-1 no-scrollbar"
              : "max-w-full overflow-x-auto no-scrollbar",
            tab: isMobile ? "h-10 px-4" : undefined,
            tabContent: isMobile ? "text-sm font-medium" : undefined,
          }}
          selectedKey={activeTab}
          onSelectionChange={key => {
            const nextTab = key as RecommendTabKey;
            const viewport = getScrollElement();
            if (viewport) {
              scrollRestoreRef.current = { tab: nextTab, top: viewport.scrollTop };
            }
            setActiveTab(nextTab);
          }}
        >
          <Tab key="music" title="音乐" />
          <Tab key="guichu" title="鬼畜" />
          <Tab key="pop" title="流行" />
        </Tabs>
        <AsyncButton
          color="primary"
          size={isMobile ? "sm" : "md"}
          startContent={<RiPlayFill size={18} />}
          isDisabled={initialLoading || list.length === 0}
          onPress={handlePlayAll}
          className={isMobile ? "hidden dark:text-black" : "dark:text-black"}
        >
          全部播放
        </AsyncButton>
      </div>
      {activeTab === "pop" && <NewMusicTop onLayoutChange={handlePopLayoutChange} />}
      <div className="relative">
        {!initialLoading && list.length === 0 ? (
          <div className="py-4">
            <Empty
              title={
                loadFailed
                  ? isBrowserPreview
                    ? "浏览器预览模式下无法直接加载首页推荐数据"
                    : "推荐内容加载失败"
                  : "暂无推荐内容"
              }
            />
            {loadFailed && (
              <div className="flex justify-center">
                <AsyncButton variant="flat" onPress={init}>
                  重试
                </AsyncButton>
              </div>
            )}
          </div>
        ) : shouldUseGrid ? (
          <MusicRecommendGridList
            key={listKey}
            items={list}
            hasMore={hasMore}
            loading={loadingMore}
            onLoadMore={loadMore}
            getScrollElement={getScrollElement}
            canDownload={canDownload}
            onMenuAction={handleMenuAction}
          />
        ) : (
          <MusicRecommendList
            key={listKey}
            items={list}
            hasMore={hasMore}
            loading={loadingMore}
            onLoadMore={loadMore}
            getScrollElement={getScrollElement}
            canDownload={canDownload}
            onMenuAction={handleMenuAction}
          />
        )}
        {initialLoading && list.length === 0 && (
          <div className="flex h-[40vh] items-center justify-center">
            <Spinner size="lg" />
          </div>
        )}
      </div>
    </ScrollContainer>
  );
};

export default MusicRecommend;
