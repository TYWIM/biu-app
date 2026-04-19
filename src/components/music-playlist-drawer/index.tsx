import React, { useCallback, useEffect, useMemo, useRef } from "react";

import { addToast, Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@heroui/react";
import { RiDeleteBinLine, RiFocus3Line, RiMusic2Line } from "@remixicon/react";
import clsx from "classnames";
import { uniqBy } from "es-toolkit/array";

import useIsMobile from "@/common/hooks/use-is-mobile";
import { openBiliVideoLink } from "@/common/utils/url";
import { type ScrollRefObject } from "@/components/scroll-container";
import { VirtualList } from "@/components/virtual-list";
import { useModalStore } from "@/store/modal";
import { usePlayList, type PlayData } from "@/store/play-list";
import { useUser } from "@/store/user";

import Empty from "../empty";
import IconButton from "../icon-button";
import Image from "../image";
import ListItem from "./list-item";

const RowHeight = 80;
const getQueueItemIdentity = (item?: Pick<PlayData, "source" | "id" | "type" | "bvid" | "sid"> | null) => {
  if (!item) {
    return "";
  }
  return item.source === "local" ? `local:${item.id}` : item.type === "mv" ? `mv:${item.bvid}` : `audio:${item.sid}`;
};

const PlayListDrawer = () => {
  const scrollRef = useRef<ScrollRefObject | null>(null);
  const isOpen = useModalStore(s => s.isPlayListDrawerOpen);
  const setOpen = useModalStore(s => s.setPlayListDrawerOpen);
  const isMobile = useIsMobile();
  const list = usePlayList(s => s.list);
  const playId = usePlayList(s => s.playId);
  const clear = usePlayList(s => s.clear);
  const user = useUser(s => s.user);
  const playListItem = usePlayList(state => state.playListItem);
  const addMediaDownloadTask = typeof window !== "undefined" ? window.electron?.addMediaDownloadTask : undefined;
  const canDownload = Boolean(addMediaDownloadTask);

  const playItem = useMemo(() => list.find(item => item.id === playId), [list, playId]);
  const currentPlayIdentity = useMemo(() => getQueueItemIdentity(playItem), [playItem]);
  const pureList = useMemo(() => {
    return uniqBy(list, item => getQueueItemIdentity(item));
  }, [list]);
  const currentCover = playItem?.pageCover || playItem?.cover;
  const currentTitle = playItem?.pageTitle || playItem?.title;
  const currentSubtitle = playItem?.source === "local" ? "本地音乐" : playItem?.ownerName || "未知作者";

  const handleAction = useCallback(async (key: string, item: PlayData) => {
    switch (key) {
      case "favorite":
        useModalStore.getState().onOpenFavSelectModal({
          rid: item.id,
          type: item.type === "mv" ? 2 : 12,
          title: item.title,
        });
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
            sid: item.type === "audio" ? item.id : undefined,
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
        openBiliVideoLink(item);
        break;
      case "del":
        usePlayList.getState().del(item.id);
        break;
      default:
        break;
    }
  }, [addMediaDownloadTask]);

  const scrollToPlayItem = useCallback((options?: { silent?: boolean; center?: boolean }) => {
    if (!playItem) {
      if (!options?.silent) {
        addToast({ title: "当前没有正在播放的歌曲", color: "warning" });
      }
      return;
    }

    const targetIndex = pureList.findIndex(item => getQueueItemIdentity(item) === currentPlayIdentity);
    if (targetIndex < 0) {
      if (!options?.silent) {
        addToast({ title: "未在列表中找到当前播放的歌曲", color: "warning" });
      }
      return;
    }

    const viewport = scrollRef.current?.osInstance()?.elements().viewport as HTMLElement | null;
    if (!viewport) {
      return;
    }

    const targetTop = targetIndex * RowHeight;
    const centeredTop = targetTop - (viewport.clientHeight - RowHeight) / 2;
    const maxTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    const nextTop = Math.max(0, Math.min(options?.center ? centeredTop : targetTop, maxTop));

    if (typeof viewport.scrollTo === "function") {
      viewport.scrollTo({ top: nextTop, behavior: "smooth" });
    } else {
      viewport.scrollTop = nextTop;
    }
  }, [currentPlayIdentity, playItem, pureList]);

  useEffect(() => {
    if (!isOpen || !playItem) {
      return;
    }

    const timer = window.setTimeout(() => {
      scrollToPlayItem({ silent: true, center: isMobile });
    }, isMobile ? 220 : 80);

    return () => window.clearTimeout(timer);
  }, [isMobile, isOpen, playItem, scrollToPlayItem]);

  const actionButtons = Boolean(pureList?.length) && (
    <>
      <IconButton
        tooltip="定位当前播放"
        onPress={() => scrollToPlayItem({ center: isMobile })}
        className={clsx(isMobile && "size-10 min-w-10 rounded-full bg-white/8 text-white hover:bg-white/14 hover:text-white")}
      >
        <RiFocus3Line size={16} />
      </IconButton>
      <IconButton
        tooltip="清空播放列表"
        onPress={clear}
        className={clsx(isMobile ? "size-10 min-w-10 rounded-full bg-white/8 text-white hover:bg-danger/15 hover:text-danger" : "hover:text-danger")}
      >
        <RiDeleteBinLine size={16} />
      </IconButton>
    </>
  );

  return (
    <Drawer
      placement={isMobile ? "bottom" : "right"}
      radius={isMobile ? "lg" : "md"}
      shadow={isMobile ? "lg" : "md"}
      backdrop={isMobile ? "opaque" : "transparent"}
      size={isMobile ? "full" : "sm"}
      hideCloseButton
      disableAnimation={!isMobile}
      isOpen={isOpen}
      onOpenChange={setOpen}
      classNames={{
        backdrop: clsx("z-200 window-no-drag", isMobile && "bg-black/36 backdrop-blur-sm"),
        wrapper: "z-200 window-no-drag",
        base: clsx(
          isMobile
            ? "data-[placement=bottom]:mt-auto data-[placement=bottom]:h-[min(78vh,720px)] data-[placement=bottom]:max-h-[min(78vh,720px)] data-[placement=bottom]:rounded-t-[28px]"
            : "data-[placement=right]:mb-22",
        ),
      }}
    >
      <DrawerContent className={clsx(isMobile && "overflow-hidden bg-black/72 text-white backdrop-blur-2xl")}>
        <DrawerHeader className={isMobile ? "border-b border-white/10 px-4 pb-3 pt-2" : "border-divider/40 flex flex-row items-center justify-between space-x-2 border-b px-4 py-3"}>
          {isMobile ? (
            <div className="flex w-full flex-col gap-3">
              <div className="mx-auto h-1.5 w-10 rounded-full bg-white/16" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold text-white">
                    播放列表<span className="ml-1 text-sm font-normal text-white/55">({pureList?.length || 0})</span>
                  </div>
                  <div className="mt-1 text-xs text-white/58">{playItem ? "从当前队列继续播放" : "当前还没有正在播放的内容"}</div>
                </div>
                <div className="flex items-center gap-1">{actionButtons}</div>
              </div>
            </div>
          ) : (
            <>
              <h3>
                播放列表<span className="text-default-500 text-sm">({pureList?.length || 0})</span>
              </h3>
              <div className="flex items-center">{actionButtons}</div>
            </>
          )}
        </DrawerHeader>
        {list.length ? (
          <DrawerBody className={isMobile ? "overflow-hidden px-3 pb-3 pt-3" : "overflow-hidden px-0"}>
            <div className={clsx("flex h-full min-h-0 flex-col", isMobile && "gap-3") }>
              {isMobile && playItem && (
                <button
                  type="button"
                  onClick={() => scrollToPlayItem({ silent: true, center: true })}
                  className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/8 px-3 py-3 text-left transition-colors hover:bg-white/12"
                >
                  <div className="flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-[18px] border border-white/10 bg-white/8">
                    <Image
                      removeWrapper
                      radius="lg"
                      src={currentCover}
                      alt={currentTitle || "当前播放"}
                      width={56}
                      height={56}
                      emptyPlaceholder={<RiMusic2Line className="text-white/60" />}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-[10px] font-medium tracking-[0.22em] text-white/52 uppercase">Now Playing</span>
                      <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/72">当前队列</span>
                    </div>
                    <div className="truncate text-sm font-semibold text-white">{currentTitle}</div>
                    <div className="mt-0.5 truncate text-xs text-white/62">{currentSubtitle}</div>
                  </div>
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80">
                    <RiFocus3Line size={16} />
                  </div>
                </button>
              )}
              <VirtualList
                className={isMobile ? "h-full min-h-0 w-full flex-1 px-1" : "h-full w-full px-2"}
                scrollRef={scrollRef}
                data={pureList}
                itemHeight={RowHeight}
                renderItem={item => (
                  <ListItem
                    data={item}
                    isLogin={Boolean(user?.isLogin)}
                    canDownload={canDownload}
                    isPlaying={getQueueItemIdentity(item) === currentPlayIdentity}
                    onClose={() => setOpen(false)}
                    onPress={() => playListItem(item.id)}
                    onAction={key => handleAction(key, item)}
                  />
                )}
              />
            </div>
          </DrawerBody>
        ) : (
          <Empty />
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default PlayListDrawer;
