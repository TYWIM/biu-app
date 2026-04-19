import React from "react";

import { Tooltip, Switch, type TooltipProps } from "@heroui/react";
import { twMerge } from "tailwind-merge";

import { getPlayModeList, PlayMode } from "@/common/constants/audio";
import IconButton from "@/components/icon-button";
import { usePlayList } from "@/store/play-list";

interface Props {
  className?: string;
  iconSize?: number;
  tooltipPlacement?: TooltipProps["placement"];
}

const MusicPlayMode = ({ className, iconSize = 18, tooltipPlacement = "top" }: Props) => {
  const playMode = usePlayList(s => s.playMode);
  const togglePlayMode = usePlayList(s => s.togglePlayMode);
  const shouldKeepPagesOrderInRandomPlayMode = usePlayList(s => s.shouldKeepPagesOrderInRandomPlayMode);
  const setShouldKeepPagesOrderInRandomPlayMode = usePlayList(s => s.setShouldKeepPagesOrderInRandomPlayMode);
  const [isOpen, setIsOpen] = React.useState(false);
  const closeTimer = React.useRef<number | null>(null);
  const playModeList = getPlayModeList(iconSize);

  const openPopover = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setIsOpen(true);
  };

  const closePopoverWithDelay = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
    }
    closeTimer.current = window.setTimeout(() => {
      setIsOpen(false);
      closeTimer.current = null;
    }, 150);
  };

  if (playMode === PlayMode.Random) {
    return (
      <Tooltip
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement={tooltipPlacement}
        closeDelay={150}
        content={
          <div onMouseEnter={openPopover} onMouseLeave={closePopoverWithDelay}>
            <Switch
              size="sm"
              disableAnimation
              isSelected={shouldKeepPagesOrderInRandomPlayMode}
              onValueChange={setShouldKeepPagesOrderInRandomPlayMode}
            >
              保持分集顺序
            </Switch>
          </div>
        }
      >
        <IconButton
          className={twMerge("flex-none", className)}
          aria-label="播放模式"
          onPress={togglePlayMode}
          onMouseEnter={openPopover}
          onMouseLeave={closePopoverWithDelay}
        >
          {playModeList.find(item => item.value === playMode)?.icon}
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <IconButton className={twMerge("flex-none", className)} aria-label="播放模式" onPress={togglePlayMode}>
      {playModeList.find(item => item.value === playMode)?.icon}
    </IconButton>
  );
};

export default MusicPlayMode;
