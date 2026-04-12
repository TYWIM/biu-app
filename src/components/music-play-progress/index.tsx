import { memo, useState } from "react";

import { Slider } from "@heroui/react";
import { twMerge } from "tailwind-merge";

import useIsMobile from "@/common/hooks/use-is-mobile";
import { formatDuration } from "@/common/utils/time";
import { usePlayList } from "@/store/play-list";
import { usePlayProgress } from "@/store/play-progress";

interface Props {
  isDisabled?: boolean;
  className?: string;
  trackClassName?: string;
}

const MusicPlayProgress = memo(({ isDisabled, className, trackClassName }: Props) => {
  const [hovered, setHovered] = useState(false);
  const isMobile = useIsMobile();
  const currentTime = usePlayProgress(s => s.currentTime);
  const duration = usePlayList(s => s.duration);
  const seek = usePlayList(s => s.seek);

  const showThumb = !isDisabled && (isMobile || hovered);
  const safeCurrentTime = typeof currentTime === "number" && Number.isFinite(currentTime) ? currentTime : 0;
  const safeDuration = typeof duration === "number" && Number.isFinite(duration) ? duration : 0;

  return (
    <div className={twMerge("flex w-3/4 items-center space-x-2", className)}>
      <div className="text-foreground-500 flex justify-center text-sm whitespace-nowrap">
        {formatDuration(safeCurrentTime)}
      </div>
      <Slider
        aria-label="播放进度"
        hideThumb={!showThumb}
        minValue={0}
        maxValue={safeDuration || 1}
        value={Math.min(safeCurrentTime, safeDuration || safeCurrentTime)}
        onChange={v => seek(v as number)}
        isDisabled={isDisabled}
        size="sm"
        color={isMobile || showThumb ? "primary" : "foreground"}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="flex-1"
        classNames={{
          track: twMerge("h-[4px] cursor-pointer", trackClassName),
          thumb: "w-4 h-4 bg-primary after:hidden",
        }}
      />
      <span className="text-foreground-500 flex justify-center text-sm whitespace-nowrap">
        {formatDuration(safeDuration)}
      </span>
    </div>
  );
});

export default MusicPlayProgress;
