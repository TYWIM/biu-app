import React, { useRef, useState, useEffect, useCallback } from "react";

import { Tooltip, Slider } from "@heroui/react";
import { RiVolumeDownLine, RiVolumeMuteLine, RiVolumeUpLine } from "@remixicon/react";

import { shouldUseNativePlayer } from "@/common/utils/native-player";
import { usePlayList } from "@/store/play-list";
import { useSettings } from "@/store/settings";

import IconButton from "../icon-button";

const Volume = () => {
  const followSystemVolume = useSettings(s => s.followSystemVolume);
  const useSystemVolume = shouldUseNativePlayer() && followSystemVolume;

  if (useSystemVolume) {
    return null;
  }

  const volume = usePlayList(s => s.volume);
  const isMuted = usePlayList(s => s.isMuted);
  const toggleMute = usePlayList(s => s.toggleMute);
  const setVolume = usePlayList(s => s.setVolume);

  const previousVolume = useRef(volume > 0 ? volume : 0.5);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const tooltipTimerRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const sliderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMuted && volume > 0) {
      previousVolume.current = volume;
    }
  }, [isMuted, volume]);

  const effectiveVolume = isMuted ? 0 : volume;

  const setSliderRef = useCallback((node: HTMLDivElement | null) => {
    if (sliderRef.current) {
      sliderRef.current.removeEventListener("wheel", onWheel);
    }
    sliderRef.current = node;
    if (node) {
      node.addEventListener("wheel", onWheel, { passive: false });
    }
  }, []);

  const onVolumeChange = (val: number) => {
    const nextVolume = Math.max(0, Math.min(1, val));

    if (nextVolume <= 0) {
      setVolume(0);
      if (!isMuted) {
        toggleMute();
      }
      setIsTooltipOpen(false);
      return;
    }

    previousVolume.current = nextVolume;
    setVolume(nextVolume);
    if (isMuted) {
      toggleMute();
    }
  };

  const onToggleMute = () => {
    if (effectiveVolume > 0 && !isMuted) {
      previousVolume.current = effectiveVolume;
      setVolume(0);
      toggleMute();
      setIsTooltipOpen(false);
      return;
    }

    const restoredVolume = previousVolume.current > 0 ? previousVolume.current : 0.5;
    setVolume(restoredVolume);
    if (isMuted) {
      toggleMute();
    }
  };

  const onWheel = useCallback((event: WheelEvent) => {
    event.preventDefault(); // 阻止默认滚动行为

    const state = usePlayList.getState();
    const { volume, isMuted, toggleMute, setVolume } = state;

    setIsTooltipOpen(true);

    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
    }

    tooltipTimerRef.current = setTimeout(() => {
      setIsTooltipOpen(false);
    }, 3000);

    const delta = event.deltaY > 0 ? -0.05 : 0.05;
    let newVolume = (isMuted ? 0 : volume) + delta;

    newVolume = Math.max(0, Math.min(1, newVolume));

    if (newVolume <= 0) {
      setVolume(0);
      if (!isMuted) {
        toggleMute();
      }
      setIsTooltipOpen(false);
      return;
    }

    previousVolume.current = newVolume;
    setVolume(newVolume);
    if (isMuted) {
      toggleMute();
    }
  }, []);

  useEffect(() => {
    const button = buttonRef.current;
    if (button) {
      button.addEventListener("wheel", onWheel, { passive: false });
    }

    return () => {
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
      }
      if (button) {
        button.removeEventListener("wheel", onWheel);
      }
    };
  }, [onWheel]);

  const tooltipId = "volume-tooltip";

  return (
    <Tooltip
      disableAnimation
      id={tooltipId}
      placement="top"
      delay={300}
      showArrow={false}
      triggerScaleOnOpen={false}
      shouldCloseOnBlur={false}
      isOpen={isTooltipOpen}
      onOpenChange={setIsTooltipOpen}
      content={
        <div ref={setSliderRef} className="flex items-center justify-center p-3">
          <Slider
            disableAnimation
            aria-label="音量"
            color="primary"
            radius="full"
            size="sm"
            orientation="vertical"
            value={effectiveVolume}
            minValue={0}
            maxValue={1}
            step={0.01}
            // @ts-expect-error volume is number
            onChange={onVolumeChange}
            classNames={{
              trackWrapper: "h-40 w-[32px]",
              thumb: "after:hidden",
            }}
            endContent={
              <span className="text-foreground/60 w-8 text-center text-xs tabular-nums">
                {Math.round(effectiveVolume * 100)}%
              </span>
            }
          />
        </div>
      }
    >
      <IconButton
        ref={buttonRef}
        onPress={onToggleMute}
        aria-label={isMuted ? "取消静音" : "静音"}
        aria-describedby={tooltipId}
      >
        {isMuted || effectiveVolume === 0 ? (
          <RiVolumeMuteLine size={18} />
        ) : effectiveVolume > 0.5 ? (
          <RiVolumeUpLine size={18} />
        ) : (
          <RiVolumeDownLine size={18} />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default Volume;
