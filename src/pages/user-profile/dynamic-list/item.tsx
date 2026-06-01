import React, { useState } from "react";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  addToast,
  User,
} from "@heroui/react";
import {
  RiChat3Line,
  RiExternalLinkLine,
  RiMore2Fill,
  RiPlayFill,
  RiPlayListAddLine,
  RiShareForwardLine,
  RiThumbUpFill,
  RiThumbUpLine,
} from "@remixicon/react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";

dayjs.extend(relativeTime);
import { twMerge } from "tailwind-merge";

import type { WebDynamicItem } from "@/service/web-dynamic";

import useIsMobile from "@/common/hooks/use-is-mobile";
import { formatNumber } from "@/common/utils/number";
import { openBiliVideoLink } from "@/common/utils/url";
import CommentList from "@/components/comment-list";
import Image from "@/components/image";
import { postDynamicFeedThumb } from "@/service/web-dynamic-feed-thumb";
import { useMusicFavStore } from "@/store/music-fav";
import { usePlayList } from "@/store/play-list";

interface DynamicItemProps {
  item: WebDynamicItem;
}

const DynamicItem = ({ item }: DynamicItemProps) => {
  const isMobile = useIsMobile();
  const author = item.modules.module_author;
  const dynamic = item.modules.module_dynamic;
  const stat = item.modules.module_stat;
  const archive = dynamic?.major?.archive || dynamic?.major?.ugc_season;
  const play = usePlayList(s => s.play);
  const addToNext = usePlayList(s => s.addToNext);
  const [isLike, setIsLike] = useState(() => stat?.like?.status === true);
  const [likeCount, setLikeCount] = useState(() => stat?.like?.count || 0);
  const [commentCount, setCommentCount] = useState(() => stat?.comment?.count || 0);
  const [isCommentOpen, setIsCommentOpen] = useState(false);

  const timeDisplay = author?.pub_time || dayjs(author?.pub_ts * 1000).fromNow();
  const textContent = dynamic?.desc?.text || dynamic?.major?.opus?.summary?.text || "";
  const commentTargetId = item.basic?.comment_id_str || item.basic?.rid_str || item.id_str;
  const commentType = item.basic?.comment_type || 8;
  const shareUrl = `https://t.bilibili.com/${item.id_str}`;
  const imageItems = dynamic?.major?.opus?.pics || dynamic?.major?.draw?.items || [];

  const handlePlay = async () => {
    if (archive) {
      await play({
        bvid: archive.bvid,
        title: archive.title,
        cover: archive.cover,
        ownerName: author?.name || "",
        ownerMid: author?.mid || 0,
        type: "mv",
      });
    }
  };

  const handleThumb = async () => {
    const prevIsLike = isLike;
    const prevLikeCount = likeCount;
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
      setLikeCount(prevLikeCount);
      if (playItem?.bvid && archive?.bvid && playItem.bvid === archive.bvid) {
        useMusicFavStore.getState().setIsThumb(prevIsLike);
      }
      addToast({ title: "点赞失败，请稍后重试", color: "danger" });
    }
  };

  const handleOpenComments = () => {
    if (!commentTargetId || stat?.comment?.forbidden) {
      addToast({ title: "该动态暂不支持评论", color: "default" });
      return;
    }
    setIsCommentOpen(true);
  };

  const handleShare = async () => {
    const shareText = archive?.title || textContent || `${author?.name} 的动态`;
    try {
      if (navigator.share) {
        await navigator.share({ title: shareText, text: shareText, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      addToast({ title: "动态链接已复制", color: "success" });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(shareUrl);
        addToast({ title: "动态链接已复制", color: "success" });
      } catch {
        addToast({ title: "分享失败，请稍后重试", color: "danger" });
      }
    }
  };

  return (
    <>
      <Card className={twMerge("border-default-100 mb-2 w-full rounded-none border-b bg-transparent shadow-none", isMobile ? "pb-3" : "pb-4")}>
        <CardHeader className={twMerge("flex items-start justify-between px-0 py-2", isMobile ? "flex-col gap-3" : undefined)}>
          <User
            isFocusable
            avatarProps={{ src: author?.face }}
            description={
              <div className="text-tiny text-default-500 flex items-center gap-1">
                <span>{timeDisplay}</span>
                {author?.pub_action && (
                  <>
                    <span>&middot;</span>
                    <span>{author.pub_action}</span>
                  </>
                )}
              </div>
            }
            name={author?.name}
            className="cursor-pointer"
            classNames={{ name: "hover:underline" }}
          />
          <div className={isMobile ? "flex w-full items-center gap-1" : "flex items-center gap-1"}>
            <Button
              variant="light"
              size="sm"
              className={twMerge(
                "text-default-500 data-[hover=true]:bg-default-100 gap-1",
                isMobile ? "min-w-0 flex-1 justify-center px-2" : undefined,
              )}
              onPress={handleThumb}
              isDisabled={stat?.like?.forbidden}
            >
              {isLike ? <RiThumbUpFill size={18} /> : <RiThumbUpLine size={18} />}
              <span>{likeCount > 0 ? formatNumber(likeCount) : "点赞"}</span>
            </Button>
            <Button
              variant="light"
              size="sm"
              className={twMerge(
                "text-default-500 data-[hover=true]:bg-default-100 gap-1",
                isMobile ? "min-w-0 flex-1 justify-center px-2" : undefined,
              )}
              onPress={handleOpenComments}
              isDisabled={stat?.comment?.forbidden}
            >
              <RiChat3Line size={18} />
              <span>{commentCount > 0 ? formatNumber(commentCount) : "评论"}</span>
            </Button>
            <Button
              variant="light"
              size="sm"
              className={twMerge(
                "text-default-500 data-[hover=true]:bg-default-100 gap-1",
                isMobile ? "min-w-0 flex-1 justify-center px-2" : undefined,
              )}
              onPress={handleShare}
            >
              <RiShareForwardLine size={18} />
              <span>{stat?.forward?.count ? formatNumber(stat.forward.count) : "转发"}</span>
            </Button>
            <Dropdown>
              <DropdownTrigger>
                <Button variant="light" isIconOnly size="sm" radius="md" className="text-default-500">
                  <RiMore2Fill size={16} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="动态操作">
                <DropdownItem
                  key="add-next"
                  startContent={<RiPlayListAddLine size={18} />}
                  onPress={() => {
                    if (archive) {
                      addToNext({
                        type: "mv",
                        bvid: archive.bvid,
                        title: archive.title,
                        cover: archive.cover,
                        ownerName: author?.name || "",
                        ownerMid: author?.mid || 0,
                      });
                      addToast({ title: "已添加到下一首播放", color: "success" });
                    }
                  }}
                >
                  添加到下一首播放
                </DropdownItem>
                <DropdownItem
                  key="open"
                  startContent={<RiExternalLinkLine size={18} />}
                  onPress={() => {
                    if (!archive) return;
                    openBiliVideoLink({ type: "mv", bvid: archive.bvid });
                  }}
                >
                  打开B站链接
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </CardHeader>

        <CardBody className="group text-small text-default-700 px-0 py-1 whitespace-pre-wrap">
          {Boolean(textContent) && <p className="mb-2 leading-relaxed">{textContent}</p>}
          {Boolean(archive) && (
            <div
              className="group border-default-200 dark:border-default-100 bg-default-50 hover:bg-default-100 relative mt-2 cursor-pointer overflow-hidden rounded-xl border"
              onClick={handlePlay}
            >
              <div className={isMobile ? "flex flex-col" : "flex flex-row"}>
                <div className={isMobile ? "relative aspect-video w-full shrink-0" : "relative h-32 w-48 shrink-0"}>
                  <Image
                    params="472w_264h_1c_!web-dynamic.webp"
                    removeWrapper
                    radius="none"
                    src={archive.cover}
                    alt={archive.title}
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
                    {archive.duration_text || ""}
                  </div>
                </div>
                <div className={isMobile ? "flex min-w-0 grow flex-col gap-2 p-3" : "flex min-w-0 grow flex-col justify-between p-3"}>
                  <div className="space-y-1">
                    <h3 className="line-clamp-2 text-sm font-medium" title={archive.title || ""}>
                      {archive.title || ""}
                    </h3>
                    <div className="text-default-500 line-clamp-1 text-xs">{archive.desc || ""}</div>
                  </div>
                  <span className="text-default-400 mt-1 text-xs">{archive.stat?.play || 0}观看</span>
                </div>
              </div>
            </div>
          )}
          {!archive && imageItems.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-1.5 overflow-hidden rounded-xl">
              {imageItems.slice(0, 9).map((image, index) => (
                <Image
                  key={`${image.src}-${index}`}
                  removeWrapper
                  radius="none"
                  src={image.src}
                  alt=""
                  className="aspect-square w-full object-cover"
                  classNames={{ wrapper: "w-full" }}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Drawer
        isOpen={isCommentOpen}
        onOpenChange={open => {
          setIsCommentOpen(open);
          if (!open) setCommentCount(stat?.comment?.count || commentCount);
        }}
        placement="bottom"
        size="full"
        radius="none"
        classNames={{ base: "h-[86vh]" }}
      >
        <DrawerContent>
          <DrawerHeader className="border-divider/40 border-b px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold">动态评论</div>
              <div className="text-default-500 truncate text-xs">{author?.name}</div>
            </div>
          </DrawerHeader>
          <DrawerBody className="min-h-0 overflow-hidden p-0">
            <CommentList targetId={commentTargetId} type={commentType} title="评论" />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default DynamicItem;
