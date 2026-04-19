import { useState } from "react";
import { useNavigate } from "react-router";

import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@heroui/react";
import { RiMoreFill, RiMusic2Line, RiPlayFill } from "@remixicon/react";
import clx from "classnames";

import useIsMobile from "@/common/hooks/use-is-mobile";
import Image from "@/components/image";
import { type PlayData } from "@/store/play-list";

import { getMenus } from "./menu";

interface Props {
  data: PlayData;
  isLogin: boolean;
  canDownload?: boolean;
  isPlaying?: boolean;
  onAction: (key: string) => void;
  onClose: VoidFunction;
  onPress?: VoidFunction;
}

const ListItem = ({ data, isLogin, canDownload, isPlaying, onAction, onClose, onPress }: Props) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const displayTitle = data.pageTitle || data.title;
  const displaySubtitle = data?.source === "local" ? "本地音乐" : data?.ownerName || "未知";
  const mediaBadge = data.source === "local" ? "本地" : data.type === "audio" ? "音频" : "视频音频";
  const pageBadge = data.hasMultiPart && data.pageIndex ? `P${data.pageIndex}/${data.totalPage || "?"}` : undefined;

  return (
    <Button
      as="div"
      key={data.id}
      fullWidth
      disableAnimation
      variant={isPlaying ? "flat" : "light"}
      color={isPlaying && !isMobile ? "primary" : "default"}
      onPress={onPress}
      className={clx(
        "group flex h-auto min-h-auto w-full min-w-auto items-center justify-between rounded-[18px] transition-colors",
        isMobile ? "px-3 py-2.5" : "rounded-md p-2",
        isMobile && !isPlaying && "bg-white/0 text-white hover:bg-white/8 hover:text-white",
        isMobile && isPlaying && "border border-white/12 bg-white/12 text-white shadow-[0_10px_24px_-20px_rgba(255,255,255,0.9)]",
      )}
    >
      <div className="m-0 flex min-w-0 flex-1 items-center gap-3">
        <div className={clx("relative flex-none overflow-hidden", isMobile ? "h-14 w-14 rounded-[18px]" : "h-12 w-12 rounded-md")}>
          <Image
            removeWrapper
            radius={isMobile ? "lg" : "md"}
            src={data.pageCover || data.cover}
            alt={displayTitle}
            width={isMobile ? 56 : 48}
            height={isMobile ? 56 : 48}
            emptyPlaceholder={<RiMusic2Line className={clx(isMobile ? "text-white/55" : "text-default-500")} />}
          />
          {!isPlaying && !isMobile && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-md bg-[rgba(0,0,0,0.35)] opacity-0 group-hover:opacity-100">
              <RiPlayFill size={20} className="text-white transition-transform duration-200 group-hover:scale-110" />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-auto flex-col items-start justify-center gap-1">
          <div className="flex w-full items-center gap-2">
            <span className={clx("min-w-0 flex-1 truncate", isMobile ? "text-sm font-semibold text-white" : "text-base")}>{displayTitle}</span>
            {isPlaying && (
              <span
                className={clx(
                  "flex flex-none items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                  isMobile ? "border border-white/10 bg-white/10 text-white/80" : "bg-primary/10 text-primary",
                )}
              >
                <RiPlayFill size={10} />
                正在播放
              </span>
            )}
          </div>
          <div className="flex w-full items-center gap-2 overflow-hidden">
            <span
              className={clx(
                "truncate text-xs",
                isMobile ? "max-w-[42%] text-white/58" : "text-foreground-500",
                {
                  "cursor-pointer hover:underline": Boolean(data?.ownerMid),
                },
              )}
              onClick={e => {
                e.stopPropagation();
                if (!data?.ownerMid) return;
                navigate(`/user/${data?.ownerMid}`);
                onClose();
              }}
            >
              {displaySubtitle}
            </span>
            <span className={clx("rounded-full px-2 py-0.5 text-[10px] font-medium", isMobile ? "border border-white/10 bg-white/8 text-white/66" : "bg-default-100 text-default-600")}>
              {mediaBadge}
            </span>
            {pageBadge && (
              <span className={clx("rounded-full px-2 py-0.5 text-[10px] font-medium", isMobile ? "border border-white/10 bg-white/8 text-white/66" : "bg-default-100 text-default-600")}>
                {pageBadge}
              </span>
            )}
          </div>
        </div>
        <Dropdown
          disableAnimation
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          classNames={{
            content: "min-w-fit",
          }}
        >
          <DropdownTrigger>
            <Button
              isIconOnly
              variant="light"
              size="sm"
              className={clx(
                "flex-none transition-opacity duration-200",
                isMobile
                  ? "size-9 min-w-9 rounded-full bg-white/8 text-white opacity-100 hover:bg-white/14 hover:text-white"
                  : `${isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"} group-hover:pointer-events-auto group-hover:opacity-100`,
              )}
            >
              <RiMoreFill size={16} />
            </Button>
          </DropdownTrigger>

          <DropdownMenu
            aria-label="播放列表操作菜单"
            items={getMenus({ isLogin, isLocal: data.source === "local", canDownload })}
            // @ts-ignore 忽略onAction类型问题
            onAction={onAction}
          >
            {item => (
              <DropdownItem key={item.key} color={item.color} startContent={item.icon}>
                {item.label}
              </DropdownItem>
            )}
          </DropdownMenu>
        </Dropdown>
      </div>
    </Button>
  );
};

export default ListItem;
