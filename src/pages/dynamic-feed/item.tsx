import React, { useState } from "react";
import { useNavigate } from "react-router";

import { Button, Card, CardHeader, CardBody, addToast, User } from "@heroui/react";
import { RiPlayFill, RiThumbUpFill, RiThumbUpLine } from "@remixicon/react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";

dayjs.extend(relativeTime);
import { twMerge } from "tailwind-merge";

import type { WebDynamicItem } from "@/service/web-dynamic";

import useIsMobile from "@/common/hooks/use-is-mobile";
import { formatNumber } from "@/common/utils/number";
import Image from "@/components/image";
import { postDynamicFeedThumb } from "@/service/web-dynamic-feed-thumb";
import { useMusicFavStore } from "@/store/music-fav";
import { usePlayList } from "@/store/play-list";

import MoreMenu from "./more-menu";

interface DynamicItemProps {
  item: WebDynamicItem;
  className?: string;
}

const DynamicItem: React.FC<DynamicItemProps> = ({ item, className }) => {
  const isMobile = useIsMobile();
  const electron = typeof window !== "undefined" ? window.electron : undefined;
  const canDownload = Boolean(electron?.addMediaDownloadTask);
  const author = item.modules.module_author;
  const dynamic = item.modules.module_dynamic;
  const stat = item.modules.module_stat;
  const archive = dynamic.major?.archive;
  const play = usePlayList(s => s.play);
  const addToNext = usePlayList(s => s.addToNext);
  const navigate = useNavigate();
  const [isLike, setIsLike] = useState(() => stat?.like?.status === true);
  const [likeCount, setLikeCount] = useState(() => stat?.like?.count || 0);

  const timeDisplay = author.pub_time || dayjs(author.pub_ts * 1000).fromNow();

  const textContent = dynamic.desc?.text || dynamic.major?.opus?.summary?.text || "";

  const handleDownload = async (type: "audio" | "video") => {
    if (!electron?.addMediaDownloadTask) {
      addToast({ title: "浏览器预览模式不支持下载", color: "default" });
      return;
    }

    await electron.addMediaDownloadTask({
      outputFileType: type,
      title: archive?.title as string,
      cover: archive?.cover,
      bvid: archive?.bvid,
    });
    addToast({
      title: "已添加到下载队列",
      color: "success",
    });
  };

  const handleThumb = async () => {
    const prevIsLike = isLike;
    const prevCount = likeCount;
    setIsLike(!prevIsLike);
    setLikeCount(prev => prev + (prevIsLike ? -1 : 1));
    const playItem = usePlayList.getState().getPlayItem();
    if (playItem?.bvid && archive?.bvid && playItem.bvid === archive.bvid) {
      useMusicFavStore.getState().setIsThumb(!prevIsLike);
    }
    try {
      await postDynamicFeedThumb({
        dyn_id_str: item.id_str,
        up: prevIsLike ? 2 : 1,
      });
    } catch {
      setIsLike(prevIsLike);
      setLikeCount(prevCount);
      if (playItem?.bvid && archive?.bvid && playItem.bvid === archive.bvid) {
        useMusicFavStore.getState().setIsThumb(prevIsLike);
      }
      addToast({
        title: "点赞失败，请稍后重试",
        color: "danger",
      });
    }
  };

  return (
    <Card className={twMerge("border-default-100 mb-2 w-full rounded-none border-b bg-transparent shadow-none", isMobile ? "pb-3" : "pb-4")}>
      <CardHeader className={twMerge(isMobile ? "flex flex-col gap-3 px-0 pt-3 pb-2" : "flex items-start justify-between px-0 pt-4 pb-2", className)}>
        <User
          isFocusable
          avatarProps={{
            src: author.face,
          }}
          description={
            <div className="text-tiny text-default-500 flex items-center gap-1">
              <span>{timeDisplay}</span>
              {author.pub_action && (
                <>
                  <span>·</span>
                  <span>{author.pub_action}</span>
                </>
              )}
            </div>
          }
          name={author.name}
          className={twMerge("cursor-pointer", isMobile ? "w-full justify-start" : undefined)}
          classNames={{
            name: "hover:underline",
          }}
          onClick={() => {
            navigate(`/user/${author.mid}`);
          }}
        />
        <div className={isMobile ? "flex w-full items-center gap-2" : "flex items-center"}>
          <Button
            variant="light"
            size="sm"
            className={twMerge(
              "text-default-500 data-[hover=true]:bg-default-100 gap-1",
              isMobile ? "flex-1 justify-center" : "flex-1",
            )}
            onPress={handleThumb}
          >
            {isLike ? <RiThumbUpFill size={18} /> : <RiThumbUpLine size={18} />}
            <span>{likeCount > 0 ? formatNumber(likeCount) : "点赞"}</span>
          </Button>
          <MoreMenu
            onAddToNext={() => {
              if (archive) {
                addToNext({
                  type: "mv",
                  bvid: archive.bvid,
                  title: archive.title,
                  cover: archive.cover,
                  ownerName: author.name,
                  ownerMid: author.mid,
                });
                addToast({
                  title: "已添加到下一首播放",
                  color: "success",
                });
              }
            }}
            onDownloadAudio={() => handleDownload("audio")}
            onDownloadVideo={() => handleDownload("video")}
            canDownload={canDownload}
          />
        </div>
      </CardHeader>

      <CardBody className="group text-small text-default-700 px-0 py-1 whitespace-pre-wrap">
        {Boolean(textContent) && <p className="mb-2 leading-relaxed">{textContent}</p>}
        <div
          className="group border-default-200 dark:border-default-100 bg-default-50 hover:bg-default-100 relative mt-2 cursor-pointer overflow-hidden rounded-xl border"
          onClick={async () => {
            await play({
              bvid: archive?.bvid || "",
              title: archive?.title || "",
              cover: archive?.cover || "",
              ownerName: author?.name || "",
              ownerMid: author?.mid || 0,
              type: "mv",
            });
          }}
        >
          <div className={isMobile ? "flex flex-col" : "flex flex-row"}>
            <div className={isMobile ? "relative aspect-video w-full shrink-0" : "relative h-32 w-48 shrink-0"}>
              <Image
                params="472w_264h_1c_!web-dynamic.webp"
                removeWrapper
                radius="none"
                src={archive?.cover || ""}
                alt={archive?.title || ""}
                className="h-full w-full object-cover"
                classNames={{
                  wrapper: "w-full h-full",
                  img: "w-full h-full",
                }}
              />
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[rgba(0,0,0,0.4)] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <RiPlayFill size={32} className="text-white" />
              </div>
              <div className="absolute right-1 bottom-1 z-20 rounded bg-black/70 px-1 text-xs text-white">
                {archive?.duration_text || ""}
              </div>
            </div>
            <div className={isMobile ? "flex min-w-0 grow flex-col gap-2 p-3" : "flex min-w-0 grow flex-col justify-between p-3"}>
              <div className="space-y-1">
                <h3 className="line-clamp-2 text-sm font-medium" title={archive?.title || ""}>
                  {archive?.title || ""}
                </h3>
                <div className="text-default-500 line-clamp-1 text-xs">{archive?.desc || ""}</div>
              </div>
              <span className="text-default-400 mt-1 text-xs">{archive?.stat?.play || 0}观看</span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default DynamicItem;
