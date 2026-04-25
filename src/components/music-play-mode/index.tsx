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
  const [justSwitched, setJustSwitched] = React.useState(false);
  const closeTimer = React.useRef<number | null>(null);
  const switchTimer = React.useRef<number | null>(null);
  const playModeList = getPlayModeList(iconSize);
  const currentMode = playModeList.find(item => item.value === playMode);

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

  const handleToggle = () => {
    togglePlayMode();
    setJustSwitched(true);
    if (switchTimer.current) clearTimeout(switchTimer.current);
    switchTimer.current = window.setTimeout(() => {
      setJustSwitched(false);
      switchTimer.current = null;
    }, 1200);
    setIsOpen(true);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setIsOpen(false);
      closeTimer.current = null;
    }, 1500);
  };

  React.useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (switchTimer.current) clearTimeout(switchTimer.current);
    };
  }, []);

  const tooltipContent = playMode === PlayMode.Random ? (
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
  ) : (
    <span className="text-xs">{currentMode?.desc}</span>
  );

  return (
    <Tooltip
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      placement={tooltipPlacement}
      closeDelay={150}
      content={tooltipContent}
    >
      <IconButton
        className={twMerge("flex-none", className)}
        aria-label="播放模式"
        onPress={handleToggle}
        onMouseEnter={openPopover}
        onMouseLeave={closePopoverWithDelay}
      >
        {currentMode?.icon}
      </IconButton>
    </Tooltip>
  );
};

export default MusicPlayMode;
