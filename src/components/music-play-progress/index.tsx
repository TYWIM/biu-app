import { memo, useState } from "react";

import { Slider } from "@heroui/react";
import { twMerge } from "tailwind-merge";
import { useShallow } from "zustand/shallow";

import useIsMobile from "@/common/hooks/use-is-mobile";
import { formatDuration } from "@/common/utils/time";
import { usePlayList } from "@/store/play-list";
import { usePlayProgress } from "@/store/play-progress";

interface Props {
  isDisabled?: boolean;
  className?: string;
  trackClassName?: string;
  timeClassName?: string;
  thumbClassName?: string;
}

const MusicPlayProgress = memo(({ isDisabled, className, trackClassName, timeClassName, thumbClassName }: Props) => {
  const [hovered, setHovered] = useState(false);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const currentTime = usePlayProgress(s => s.currentTime);
  const { duration, seek } = usePlayList(
    useShallow(state => ({
      duration: state.duration,
      seek: state.seek,
    })),
  );

  const showThumb = !isDisabled && (isMobile || hovered || dragValue !== null);
  const safeCurrentTime = typeof currentTime === "number" && Number.isFinite(currentTime) ? currentTime : 0;
  const safeDuration = typeof duration === "number" && Number.isFinite(duration) ? duration : 0;
  const displayCurrentTime = dragValue ?? safeCurrentTime;
  const sliderValue = Math.min(displayCurrentTime, safeDuration || displayCurrentTime);

  const handleChange = (value: number | number[]) => {
    const nextValue = Array.isArray(value) ? value[0] : value;
    setDragValue(typeof nextValue === "number" && Number.isFinite(nextValue) ? nextValue : 0);
  };

  const handleChangeEnd = (value: number | number[]) => {
    const nextValue = Array.isArray(value) ? value[0] : value;
    setDragValue(null);
    if (typeof nextValue === "number" && Number.isFinite(nextValue)) {
      seek(nextValue);
    }
  };

  return (
    <div className={twMerge("flex w-3/4 items-center space-x-2", className)}>
      <div className={twMerge("text-foreground-500 flex justify-center text-sm whitespace-nowrap", timeClassName)}>
        {formatDuration(displayCurrentTime)}
      </div>
      <Slider
        aria-label="播放进度"
        hideThumb={!showThumb}
        minValue={0}
        maxValue={safeDuration || 1}
        value={sliderValue}
        onChange={handleChange}
        onChangeEnd={handleChangeEnd}
        isDisabled={isDisabled}
        size="sm"
        color={isMobile || showThumb ? "primary" : "foreground"}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="flex-1"
        classNames={{
          track: twMerge("h-[4px] cursor-pointer", trackClassName),
          thumb: twMerge("w-4 h-4 bg-primary after:hidden", thumbClassName),
        }}
      />
      <span className={twMerge("text-foreground-500 flex justify-center text-sm whitespace-nowrap", timeClassName)}>
        {formatDuration(safeDuration)}
      </span>
    </div>
  );
});

export default MusicPlayProgress;
