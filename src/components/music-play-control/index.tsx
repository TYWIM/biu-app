import React, { memo } from "react";

import { RiPauseCircleFill, RiPlayCircleFill, RiSkipBackFill, RiSkipForwardFill } from "@remixicon/react";
import { twMerge } from "tailwind-merge";
import { useShallow } from "zustand/shallow";

import IconButton from "@/components/icon-button";
import { usePlayList } from "@/store/play-list";

interface Props {
  className?: string;
  secondaryButtonClassName?: string;
  primaryButtonClassName?: string;
  secondaryIconSize?: number;
  primaryIconSize?: number;
}

const MusicPlayControl = ({
  className,
  secondaryButtonClassName,
  primaryButtonClassName,
  secondaryIconSize = 22,
  primaryIconSize = 48,
}: Props) => {
  const { prev, next, togglePlay, isPlaying, listLength } = usePlayList(
    useShallow(state => ({
      prev: state.prev,
      next: state.next,
      togglePlay: state.togglePlay,
      isPlaying: state.isPlaying,
      listLength: state.list.length,
    })),
  );

  const isEmptyPlayList = listLength === 0;
  const isSingle = listLength === 1;

  return (
    <div className={twMerge("flex items-center justify-center space-x-6", className)}>
      <IconButton radius="md" onPress={prev} isDisabled={isEmptyPlayList || isSingle} className={secondaryButtonClassName}>
        <RiSkipBackFill size={secondaryIconSize} />
      </IconButton>
      <IconButton
        isDisabled={isEmptyPlayList}
        radius="full"
        onPress={togglePlay}
        className={twMerge("size-12 min-w-12", primaryButtonClassName)}
      >
        {isPlaying ? <RiPauseCircleFill size={primaryIconSize} /> : <RiPlayCircleFill size={primaryIconSize} />}
      </IconButton>
      <IconButton radius="md" onPress={next} isDisabled={isEmptyPlayList || isSingle} className={secondaryButtonClassName}>
        <RiSkipForwardFill size={secondaryIconSize} />
      </IconButton>
    </div>
  );
};

export default memo(MusicPlayControl);
