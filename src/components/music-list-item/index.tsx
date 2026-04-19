import type { ReactNode } from "react";
import { useNavigate } from "react-router";

import { Button } from "@heroui/react";
import { RiPlayFill } from "@remixicon/react";
import clx from "classnames";

import useIsMobile from "@/common/hooks/use-is-mobile";
import { formatNumber } from "@/common/utils/number";
import { formatDuration } from "@/common/utils/time";
import Image from "@/components/image";
import { isSame, usePlayList } from "@/store/play-list";
import { useSettings } from "@/store/settings";

import type { ContextMenuItem } from "../context-menu";

import ContextMenu from "../context-menu";
import OperationMenu from "./operation";
import { getMusicListItemGrid } from "./styles";

interface Props {
  title: ReactNode;
  type: "audio" | "mv";
  bvid?: string;
  sid?: number;
  cover?: string;
  upName?: string;
  upMid?: number;
  onPress?: () => void;
  playCount?: number;
  duration?: number | string;
  index?: number;
  pubTime?: string;
  menus: ContextMenuItem[];
  onMenuAction?: (key: string) => void;
  hidePubTime?: boolean;
}

const MusicListItem = ({
  title,
  type,
  bvid,
  sid,
  cover,
  upName,
  upMid,
  menus,
  onMenuAction,
  onPress,
  playCount,
  duration,
  index,
  pubTime,
  hidePubTime,
}: Props) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isPlay = usePlayList(state => isSame(state.list.find(item => item.id === state.playId), { type, bvid, sid }));
  const displayMode = useSettings(state => state.displayMode);
  const isCompact = displayMode === "compact";
  const durationText = typeof duration === "number" ? formatDuration(duration) : duration;

  const gridCols = getMusicListItemGrid(isCompact, hidePubTime);

  if (isMobile) {
    return (
      <ContextMenu items={menus} onAction={onMenuAction}>
        <Button
          as="div"
          radius="lg"
          fullWidth
          disableAnimation
          variant={isPlay ? "flat" : "light"}
          color={isPlay ? "primary" : "default"}
          onPress={onPress}
          className={clx(
            "group flex h-auto min-h-auto w-full min-w-0 items-center justify-between rounded-[18px] px-3 py-2.5",
            isPlay ? "bg-primary/10" : "bg-content1/40",
          )}
        >
          <div className="flex w-full min-w-0 items-center gap-3">
            <div className="relative h-14 w-14 flex-none overflow-hidden rounded-[16px] border border-black/5 bg-black/5 dark:border-white/10 dark:bg-white/8">
              <Image
                removeWrapper
                radius="lg"
                src={cover}
                width="100%"
                height="100%"
                className="m-0 h-full w-full object-cover"
                params="672w_378h_1c.avif"
              />
              {!isPlay && typeof onPress === "function" && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[16px] bg-[rgba(0,0,0,0.28)] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <RiPlayFill size={20} className="text-white transition-transform duration-200 group-hover:scale-110" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className={clx("truncate text-sm font-semibold", { "text-primary": isPlay })}>{title}</div>
                  <div className="mt-1 flex items-center gap-2 overflow-hidden text-xs text-foreground-500">
                    {Boolean(upName) && (
                      <span
                        className={clx("truncate", {
                          "cursor-pointer hover:underline": Boolean(upMid),
                        })}
                        onClick={e => {
                          e.stopPropagation();
                          if (!upMid) return;
                          navigate(`/user/${upMid}`);
                        }}
                      >
                        {upName || "未知"}
                      </span>
                    )}
                    {Boolean(durationText) && <span className="shrink-0 tabular-nums">{durationText}</span>}
                  </div>
                </div>
                {isPlay && (
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    正在播放
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-none items-center justify-end">
              {Boolean(menus.length) && <OperationMenu items={menus} onAction={onMenuAction} />}
            </div>
          </div>
        </Button>
      </ContextMenu>
    );
  }

  return (
    <ContextMenu items={menus} onAction={onMenuAction}>
      <Button
        as="div"
        radius="md"
        fullWidth
        disableAnimation
        variant={isPlay ? "flat" : "light"}
        color={isPlay ? "primary" : "default"}
        onDoubleClick={onPress}
        className={clx(
          "group flex w-full items-center justify-between rounded-md",
          isCompact ? "h-9 min-h-9 min-w-0 px-0 text-sm" : "h-auto min-h-auto min-w-auto space-y-2 p-2",
        )}
      >
        <div className={clx("grid w-full items-center gap-4", gridCols)}>
          {/* 1. 序号 */}
          <div className="text-foreground-500 min-w-8 text-center text-xs tabular-nums">{index}</div>

          {/* 2. 音乐信息 */}
          {isCompact ? (
            <div className="min-w-0 truncate text-left">
              <span className={clx("truncate", { "text-primary": isPlay })}>{title}</span>
            </div>
          ) : (
            <div className="flex min-w-0 items-center overflow-hidden">
              <div className="relative h-12 w-12 flex-none">
                <Image
                  removeWrapper
                  radius="md"
                  src={cover}
                  width="100%"
                  height="100%"
                  className="m-0"
                  params="672w_378h_1c.avif"
                />
                {!isPlay && typeof onPress === "function" && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center rounded-md bg-[rgba(0,0,0,0.35)] opacity-0 group-hover:opacity-100">
                    <RiPlayFill
                      size={20}
                      className="text-white transition-transform duration-200 group-hover:scale-110"
                    />
                  </div>
                )}
              </div>
              <div className="ml-2 flex min-w-0 flex-col items-start justify-center space-y-1">
                <span className={clx("w-full truncate text-left text-base", { "text-primary": isPlay })}>{title}</span>
                {Boolean(upName) && (
                  <span
                    className={clx("text-foreground-500 w-fit truncate text-sm", {
                      "cursor-pointer hover:underline": Boolean(upMid),
                    })}
                    onClick={e => {
                      e.stopPropagation();
                      if (!upMid) return;
                      navigate(`/user/${upMid}`);
                    }}
                  >
                    {upName || "未知"}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 3. UP名称 (Compact only) */}
          {isCompact && (
            <div className="min-w-0 truncate">
              <span
                className={clx("text-foreground-500 w-fit truncate text-sm", {
                  "cursor-pointer hover:underline": Boolean(upMid),
                })}
                onClick={e => {
                  e.stopPropagation();
                  if (!upMid) return;
                  navigate(`/user/${upMid}`);
                }}
              >
                {upName || "未知"}
              </span>
            </div>
          )}

          {/* 4. 播放量 */}
          <div className="text-foreground-500 flex justify-end text-xs">
            {playCount !== undefined && playCount > 0 ? formatNumber(playCount) : "-"}
          </div>

          {/* 5. 投稿时间 */}
          {!hidePubTime && (
            <div className="text-foreground-500 flex justify-end text-xs">{pubTime && <span>{pubTime}</span>}</div>
          )}

          {/* 6. 时长 */}
          <div className="text-foreground-500 flex justify-end text-xs tabular-nums">
            {Boolean(durationText) && <span>{durationText}</span>}
          </div>

          {/* 7. 操作 */}
          <div className="flex h-full items-center justify-end">
            {Boolean(menus.length) && <OperationMenu items={menus} onAction={onMenuAction} />}
          </div>
        </div>
      </Button>
    </ContextMenu>
  );
};

export default MusicListItem;
