import { memo, useEffect, useMemo, useRef, useState } from "react";

import { Button, Drawer, DrawerBody, DrawerContent, Image, Popover, PopoverContent, PopoverTrigger, Slider } from "@heroui/react";
import {
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiSettings3Line,
  RiVolumeDownLine,
  RiVolumeMuteLine,
  RiVolumeUpLine,
} from "@remixicon/react";
import { useClickAway } from "ahooks";
import clsx from "classnames";
import { readableColor } from "color2k";
import { useShallow } from "zustand/shallow";

import useIsMobile from "@/common/hooks/use-is-mobile";
import { Themes } from "@/common/constants/theme";
import { hexToHsl, resolveTheme, isHex } from "@/common/utils/color";
import { shouldUseNativePlayer } from "@/common/utils/native-player";
import Lyrics from "@/components/lyrics";
import { useFullScreenPlayerSettings } from "@/store/full-screen-player-settings";
import { useModalStore } from "@/store/modal";
import { usePlayList } from "@/store/play-list";
import { useSettings } from "@/store/settings";

import Empty from "../empty";
import IconButton from "../icon-button";
import MusicPlayControl from "../music-play-control";
import MusicPlayMode from "../music-play-mode";
import MusicPlayProgress from "../music-play-progress";
import OpenPlaylistDrawerButton from "../open-playlist-drawer-button";
import WindowAction from "../window-action";
import { useGlassmorphism } from "./glassmorphism";
import PageList from "./page-list";
import FullScreenPlayerSettingsPanel from "./settings-panel";

const MobileVolumeControl = memo(({ isDark }: { isDark: boolean }) => {
  const { followSystemVolume, update: updateSettings } = useSettings(
    useShallow(state => ({
      followSystemVolume: state.followSystemVolume,
      update: state.update,
    })),
  );
  const canFollowSystemVolume = shouldUseNativePlayer();
  const useSystemVolume = canFollowSystemVolume && followSystemVolume;

  const { volume, isMuted, toggleMute, setVolume } = usePlayList(
    useShallow(state => ({
      volume: state.volume,
      isMuted: state.isMuted,
      toggleMute: state.toggleMute,
      setVolume: state.setVolume,
    })),
  );
  const previousVolumeRef = useRef(volume > 0 ? volume : 0.5);

  useEffect(() => {
    if (!isMuted && volume > 0) {
      previousVolumeRef.current = volume;
    }
  }, [isMuted, volume]);

  const effectiveVolume = isMuted ? 0 : volume;
  const surfaceClassName = isDark
    ? "rounded-2xl border border-white/10 bg-white/6 px-3 py-2"
    : "rounded-2xl border border-slate-900/6 bg-white/70 px-3 py-2";
  const iconClassName = isDark
    ? "text-white/70 active:text-white"
    : "text-slate-600 active:text-slate-900";
  const helperTextClassName = isDark ? "text-white/46" : "text-slate-500/70";
  const switchPillClassName = isDark
    ? "rounded-full border border-white/10 bg-white/8 px-2.5 py-0.5 text-[10px] font-medium text-white/60 active:bg-white/14"
    : "rounded-full border border-slate-900/6 bg-slate-900/4 px-2.5 py-0.5 text-[10px] font-medium text-slate-600 active:bg-slate-900/8";

  if (useSystemVolume) {
    return (
      <div className={clsx("flex w-full items-center gap-2.5", surfaceClassName)}>
        <RiVolumeUpLine size={16} className={iconClassName} />
        <span className={clsx("flex-1 text-xs", helperTextClassName)}>跟随系统音量</span>
        <button type="button" onClick={() => updateSettings({ followSystemVolume: false })} className={switchPillClassName}>
          切换应用音量
        </button>
      </div>
    );
  }

  const handleVolumeChange = (value: number | number[]) => {
    const nextVolume = Array.isArray(value) ? value[0] : value;
    if (nextVolume > 0) {
      previousVolumeRef.current = nextVolume;
    }
    setVolume(nextVolume);
  };

  const handleToggleMute = () => {
    if (!isMuted && volume > 0) {
      previousVolumeRef.current = volume;
    }
    toggleMute();
  };

  const VolumeIcon = isMuted || effectiveVolume === 0 ? RiVolumeMuteLine : effectiveVolume > 0.5 ? RiVolumeUpLine : RiVolumeDownLine;

  return (
    <div className={clsx("w-full space-y-1.5", surfaceClassName)}>
      <div className="flex w-full items-center gap-2">
        <button type="button" onClick={handleToggleMute} className={clsx("flex-none p-0.5", iconClassName)}>
          <VolumeIcon size={16} />
        </button>
        <Slider
          aria-label="音量"
          minValue={0}
          maxValue={1}
          step={0.01}
          value={effectiveVolume}
          onChange={v => handleVolumeChange(v as number)}
          disableAnimation
          size="sm"
          color="primary"
          className="flex-1"
          classNames={{
            track: isDark ? "h-1 bg-white/10" : "h-1 bg-slate-900/8",
            thumb: "h-3 w-3 bg-primary after:hidden",
          }}
        />
        <span className={clsx("w-8 text-right text-[10px] tabular-nums", helperTextClassName)}>{Math.round(effectiveVolume * 100)}%</span>
      </div>
      {canFollowSystemVolume && (
        <div className="flex items-center justify-end">
          <button type="button" onClick={() => updateSettings({ followSystemVolume: true })} className={switchPillClassName}>
            切换系统音量
          </button>
        </div>
      )}
    </div>
  );
});

const FullScreenPlayer = () => {
  const electron = typeof window !== "undefined" ? window.electron : undefined;
  const platform = electron?.getPlatform?.();
  const isMobile = useIsMobile();
  const isOpen = useModalStore(s => s.isFullScreenPlayerOpen);
  const close = useModalStore(s => s.closeFullScreenPlayer);
  const playItem = usePlayList(state => state.list.find(item => item.id === state.playId));
  const primaryColor = useSettings(s => s.primaryColor);
  const themeMode = useSettings(s => s.themeMode);
  const { showLyrics, showCover, showBlurredBackground, backgroundColor, lyricsColor } =
    useFullScreenPlayerSettings(
      useShallow(s => ({
        showLyrics: s.showLyrics,
        showCover: s.showCover,
        showBlurredBackground: s.showBlurredBackground,
        backgroundColor: s.backgroundColor,
        lyricsColor: s.lyricsColor,
      })),
    );
  const isLocal = playItem?.source === "local";

  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1000);
  const [windowHeight, setWindowHeight] = useState(typeof window !== "undefined" ? window.innerHeight : 800);
  const [isPageListOpen, setIsPageListOpen] = useState(false);
  const [isUiVisible, setIsUiVisible] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);
  const [controlsHeight, setControlsHeight] = useState(80);

  const pageListRef = useRef<HTMLDivElement>(null);
  const hideUiTimeoutRef = useRef<number | null>(null);

  useClickAway(() => {
    if (isPageListOpen) {
      setIsPageListOpen(false);
    }
  }, pageListRef);

  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // Initial check
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (hideUiTimeoutRef.current) {
        window.clearTimeout(hideUiTimeoutRef.current);
        hideUiTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsUiVisible(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isUiVisible && isSettingsOpen) {
      setIsSettingsOpen(false);
    }
  }, [isUiVisible, isSettingsOpen]);

  const handleMouseEnter = () => {
    if (isMobile) {
      return;
    }
    if (hideUiTimeoutRef.current) {
      window.clearTimeout(hideUiTimeoutRef.current);
      hideUiTimeoutRef.current = null;
    }
    if (!isUiVisible) {
      setIsUiVisible(true);
    }
  };

  const scheduleHideUi = (delay: number) => {
    if (isMobile) return;
    if (isSettingsOpen) return;
    if (hideUiTimeoutRef.current) {
      window.clearTimeout(hideUiTimeoutRef.current);
    }
    hideUiTimeoutRef.current = window.setTimeout(() => {
      setIsUiVisible(false);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (isMobile) {
      return;
    }
    scheduleHideUi(3000);
  };

  const coverSrc = playItem?.pageCover || playItem?.cover;
  const { effectsProfile, bgLayerA, bgLayerB, activeBgLayer, cssVars } = useGlassmorphism(
    coverSrc,
    primaryColor,
    isOpen,
  );

  useEffect(() => {
    const updateHeight = () => {
      const el = controlsRef.current;
      if (el) {
        setControlsHeight(el.offsetHeight || 80);
      }
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  useEffect(() => {
    const el = controlsRef.current;
    if (el) {
      setControlsHeight(el.offsetHeight || 80);
    }
  }, [isUiVisible]);

  const computedForegroundHex = useMemo(() => {
    if (showBlurredBackground) return undefined;
    const baseBg =
      backgroundColor && isHex(backgroundColor) ? backgroundColor : Themes[resolveTheme(themeMode)].colors!.background;
    try {
      return readableColor(baseBg as string);
    } catch {
      return undefined;
    }
  }, [backgroundColor, themeMode, showBlurredBackground]);

  const themeVars = useMemo(() => {
    const vars: React.CSSProperties = {
      ...cssVars,
      ["--heroui-primary" as any]: hexToHsl(primaryColor),
    };
    if (computedForegroundHex) {
      vars["--heroui-foreground" as any] = hexToHsl(computedForegroundHex);
    }
    return vars;
  }, [cssVars, primaryColor, computedForegroundHex]);

  const appTheme = useMemo(() => resolveTheme(themeMode), [themeMode]);

  if (!playItem) return null;

  const displayTitle = playItem.pageTitle || playItem.title;
  const displaySubtitle = playItem.ownerName || (isLocal ? "本地音频" : "Bilibili 音乐");
  const mobileMetaBadges = [
    isLocal ? "本地" : playItem.type === "audio" ? "音频" : "视频音频",
    playItem.isLossless ? "无损" : undefined,
    playItem.isDolby ? "杜比" : undefined,
    playItem.hasMultiPart && playItem.pageIndex ? `P${playItem.pageIndex}/${playItem.totalPage || "?"}` : undefined,
  ].filter(Boolean) as string[];
  const isPlayerDark = showBlurredBackground || appTheme === "dark";
  const mobileSecondaryControlClassName = isPlayerDark
    ? "size-10 min-w-10 rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/16 hover:text-white transition-transform duration-150 active:scale-90"
    : "size-10 min-w-10 rounded-full border border-slate-900/8 bg-white/82 text-slate-900 hover:bg-white hover:text-slate-950 transition-transform duration-150 active:scale-90";
  const mobilePrimaryControlClassName = isPlayerDark
    ? "size-14 min-w-14 rounded-full bg-white text-black shadow-[0_14px_32px_-20px_rgba(255,255,255,0.88)] hover:bg-white/90 hover:text-black transition-transform duration-150 active:scale-[0.88]"
    : "size-14 min-w-14 rounded-full bg-slate-950 text-white shadow-[0_14px_32px_-20px_rgba(15,23,42,0.38)] hover:bg-slate-900 hover:text-white transition-transform duration-150 active:scale-[0.88]";
  const mobileHeaderButtonClassName = isPlayerDark
    ? "size-11 min-w-11 rounded-full border border-white/10 bg-black/20 text-white hover:bg-black/28 hover:text-white transition-transform duration-150 active:scale-90"
    : "size-11 min-w-11 rounded-full border border-slate-900/8 bg-white/80 text-slate-900 hover:bg-white hover:text-slate-950 transition-transform duration-150 active:scale-90";
  const mobileMetaBadgeClassName = isPlayerDark
    ? "rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/85 backdrop-blur-md"
    : "rounded-full border border-slate-900/8 bg-white/78 px-3 py-1 text-[11px] font-medium text-slate-800 shadow-[0_6px_16px_rgb(148_163_184_/_0.12)]";
  const mobileOverlayTintClassName = isPlayerDark ? "bg-black/12" : "bg-white/18";
  const mobileModalBackdropClassName = isPlayerDark ? "bg-black/36" : "bg-slate-900/12 backdrop-blur-[2px]";
  const mobileControlsSurfaceClassName = isPlayerDark
    ? "rounded-t-[24px] border-t border-white/10 bg-[rgba(8,10,18,0.78)] px-4 pt-2.5 pb-[calc(var(--safe-area-bottom)+10px)] shadow-[0_-16px_36px_-28px_rgba(0,0,0,0.72)]"
    : "rounded-t-[24px] border-t border-slate-900/8 bg-[rgba(255,255,255,0.88)] px-4 pt-2.5 pb-[calc(var(--safe-area-bottom)+10px)] shadow-[0_-16px_36px_-28px_rgba(148,163,184,0.36)]";
  const mobileProgressTrackClassName = isPlayerDark ? "h-[5px] bg-white/10" : "h-[5px] bg-slate-900/10";
  const mobileProgressTimeClassName = isPlayerDark ? "text-[10px] text-white/56" : "text-[10px] text-slate-700/62";
  const isMobilePageListVisible = isMobile && isPageListOpen;
  const mobileHeaderStateClassName = isMobilePageListVisible
    ? "pointer-events-none translate-y-1 opacity-55"
    : "translate-y-0 opacity-100";
  const mobileContentStateClassName = isMobilePageListVisible
    ? "scale-[0.985] -translate-y-2 opacity-70"
    : "scale-100 translate-y-0 opacity-100";
  const mobileControlsStateClassName = isMobilePageListVisible
    ? "pointer-events-auto translate-y-1 scale-[0.99] opacity-72"
    : "pointer-events-auto translate-y-0 scale-100 opacity-100";
  const mobileBackgroundLayer = activeBgLayer === "a" ? bgLayerA : bgLayerB;

  const coverWidth = isMobile
    ? Math.max(220, Math.min(windowWidth - 48, windowHeight * 0.34, 360))
    : Math.max(260, Math.min(windowWidth * 0.7, windowHeight * 0.48, 520));
  const coverHeight = isMobile ? coverWidth : coverWidth * 0.75;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={close}
      placement="bottom"
      size="full"
      radius="none"
      isDismissable={false}
      hideCloseButton
      disableAnimation
      shouldBlockScroll={false}
    >
      <DrawerContent
        className={clsx("bg-background text-foreground relative h-full overflow-hidden", {
          dark: showBlurredBackground || appTheme === "dark",
          light: !showBlurredBackground && appTheme === "light",
        })}
        style={{
          ...themeVars,
          cursor: !isMobile && !isUiVisible ? "none" : "auto",
        }}
      >
        {onClose =>
          !isOpen ? (
            <Empty />
          ) : (
            <DrawerBody
              className={clsx("group/player relative gap-0 overflow-hidden bg-transparent p-0", isMobile ? "flex flex-col" : "flex flex-row")}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onMouseMove={() => {
                if (isMobile) {
                  return;
                }
                if (!isUiVisible) {
                  setIsUiVisible(true);
                }
                scheduleHideUi(3000);
              }}
              onTouchStart={() => {
                setIsUiVisible(true);
              }}
            >
              {!showBlurredBackground && (
                <div
                  aria-hidden
                  className="absolute inset-0 -z-10"
                  style={{
                    backgroundColor: backgroundColor && isHex(backgroundColor)
                      ? backgroundColor
                      : appTheme === "dark" ? "#0b1220" : "#f8fafc",
                  }}
                />
              )}
              {showBlurredBackground && (
                isMobile ? (
                  <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    {mobileBackgroundLayer.coverSrc && (
                      <div
                        className="absolute inset-0 scale-[1.08] bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${mobileBackgroundLayer.coverSrc})`,
                          filter: `blur(${Math.max(6, effectsProfile.blurPx - 4)}px)`,
                          opacity: 0.84,
                        }}
                      />
                    )}
                    <div className="absolute inset-0" style={{ background: mobileBackgroundLayer.gradientBackground }} />
                    <div className={clsx("absolute inset-0", mobileOverlayTintClassName)} />
                  </div>
                ) : (
                  <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <div
                      className="absolute inset-0"
                      style={{
                        opacity: activeBgLayer === "a" ? 1 : 0,
                        transition: `opacity ${effectsProfile.transitionMs}ms ease`,
                        willChange: "opacity",
                      }}
                    >
                      {bgLayerA.coverSrc && (
                        <div
                          className="absolute inset-0 scale-[1.15] bg-cover bg-center"
                          style={{
                            backgroundImage: `url(${bgLayerA.coverSrc})`,
                            filter: `blur(${effectsProfile.blurPx}px)`,
                            opacity: 0.92,
                            willChange: "transform, filter, opacity",
                            transition: `filter ${effectsProfile.transitionMs}ms ease, opacity ${effectsProfile.transitionMs}ms ease`,
                          }}
                        />
                      )}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: bgLayerA.gradientBackground,
                          willChange: "opacity",
                        }}
                      />
                    </div>
                    <div
                      className="absolute inset-0"
                      style={{
                        opacity: activeBgLayer === "b" ? 1 : 0,
                        transition: `opacity ${effectsProfile.transitionMs}ms ease`,
                        willChange: "opacity",
                      }}
                    >
                      {bgLayerB.coverSrc && (
                        <div
                          className="absolute inset-0 scale-[1.15] bg-cover bg-center"
                          style={{
                            backgroundImage: `url(${bgLayerB.coverSrc})`,
                            filter: `blur(${effectsProfile.blurPx}px)`,
                            opacity: 0.92,
                            willChange: "transform, filter, opacity",
                            transition: `filter ${effectsProfile.transitionMs}ms ease, opacity ${effectsProfile.transitionMs}ms ease`,
                          }}
                        />
                      )}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: bgLayerB.gradientBackground,
                          willChange: "opacity",
                        }}
                      />
                    </div>
                  </div>
                )
              )}
              <div
                className={clsx(
                  "absolute top-0 right-0 z-20 flex w-full justify-between transition-[opacity,transform,filter] duration-300 ease-out",
                  isMobile ? "px-4 py-[calc(var(--safe-area-top)+12px)]" : "px-6 py-4",
                  isMobile ? mobileHeaderStateClassName : isUiVisible ? "opacity-100 translate-y-0 blur-0" : "pointer-events-none opacity-0 translate-y-0 blur-0",
                )}
              >
                <div className={clsx("window-no-drag top-0 right-0 left-0 flex items-center space-x-2", isMobile ? "min-w-0 flex-1" : "w-full max-w-2/5")}>
                  <IconButton
                    title="关闭弹窗"
                    onPress={onClose}
                    className={isMobile ? mobileHeaderButtonClassName : ""}
                  >
                    <RiArrowDownSLine size={28} />
                  </IconButton>
                  <h2 className={clsx("truncate select-none", isMobile ? "min-w-0 flex-1 text-base" : "text-xl")}>
                    {isMobile ? "正在播放" : displayTitle}
                  </h2>
                  <Popover
                    isOpen={isSettingsOpen && (isUiVisible || isMobile)}
                    disableAnimation
                    shouldBlockScroll={false}
                    backdrop="transparent"
                    onOpenChange={open => {
                      setIsSettingsOpen(open);
                      if (open) {
                        if (hideUiTimeoutRef.current) {
                          window.clearTimeout(hideUiTimeoutRef.current);
                          hideUiTimeoutRef.current = null;
                        }
                        setIsUiVisible(true);
                      }
                    }}
                    placement="bottom-start"
                  >
                    <PopoverTrigger>
                      <IconButton
                        title="设置"
                        tooltip="设置"
                        className={isMobile ? mobileHeaderButtonClassName : ""}
                      >
                        <RiSettings3Line size={22} />
                      </IconButton>
                    </PopoverTrigger>
                    <PopoverContent className="p-4">
                      <FullScreenPlayerSettingsPanel isUiVisible={isUiVisible} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="window-no-drag top-0 right-0">
                  {!isMobile && (platform === "linux" || platform === "windows") ? <WindowAction /> : null}
                </div>
              </div>

              {isMobile ? (
                <div
                  className={clsx(
                    "flex h-full w-full flex-col pt-[calc(var(--safe-area-top)+72px)] transition-[transform,opacity] duration-300 ease-out",
                    mobileContentStateClassName,
                  )}
                  style={{
                    paddingBottom: `calc(var(--safe-area-bottom) + ${controlsHeight + 18}px)`,
                  }}
                >
                  {!isLocal && showCover && (
                    <div className={clsx("flex flex-none justify-center px-6", showLyrics ? "pt-2" : "flex-1 items-center pb-6") }>
                      <Image
                        src={coverSrc}
                        radius="lg"
                        className="transition-shadow ease-out"
                        classNames={{
                          wrapper: "pointer-events-none max-w-full",
                          img: "w-full h-full object-cover select-none pointer-events-none",
                        }}
                        style={{
                          width: coverWidth,
                          height: coverHeight,
                          boxShadow: `0 24px 72px -32px rgb(var(--glow-rgb) / 0.55), 0 10px 32px -18px rgb(0 0 0 / 0.55)`,
                          transition: `box-shadow ${effectsProfile.transitionMs}ms ease`,
                          aspectRatio: "1 / 1",
                        }}
                      />
                    </div>
                  )}

                  <div className={clsx("flex flex-none flex-col items-center px-6 text-center", showLyrics ? "pb-3" : "pb-6")}>
                    <div className="max-w-full text-[clamp(1.25rem,5.2vw,1.75rem)] font-semibold leading-tight tracking-tight">{displayTitle}</div>
                    <div className="mt-2 max-w-full truncate text-sm text-foreground-500">{displaySubtitle}</div>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      {mobileMetaBadges.map(label => (
                        <span key={label} className={mobileMetaBadgeClassName}>
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {!isLocal && showLyrics && (
                    <div className={clsx("min-h-0 flex-1 overflow-hidden px-4 pb-4", !showCover ? "pt-6" : "pt-4")}>
                      <Lyrics color={lyricsColor} centered={!showCover} showControls={true} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  {!isLocal && showCover && (
                    <div
                      className={clsx(
                        "flex h-full w-full items-center px-12",
                        showLyrics ? "justify-end" : "justify-center",
                      )}
                    >
                      <Image
                        src={coverSrc}
                        radius="lg"
                        className="transition-shadow ease-out"
                        classNames={{
                          wrapper: "pointer-events-none",
                          img: "w-full h-full object-cover select-none pointer-events-none",
                        }}
                        style={{
                          width: coverWidth,
                          height: coverHeight,
                          boxShadow: `0 28px 90px -35px rgb(var(--glow-rgb) / 0.55), 0 10px 32px -18px rgb(0 0 0 / 0.55)`,
                          transition: `box-shadow ${effectsProfile.transitionMs}ms ease`,
                          aspectRatio: "4 / 3",
                        }}
                      />
                    </div>
                  )}

                  {!isLocal && showLyrics && (
                    <div
                      className={clsx(
                        "h-full w-full overflow-hidden px-12 py-24",
                        !showCover ? "flex items-center justify-center" : "",
                      )}
                    >
                      <Lyrics color={lyricsColor} centered={!showCover} showControls={isUiVisible} />
                    </div>
                  )}
                </div>
              )}

              {isMobile && (
                <button
                  type="button"
                  aria-label="关闭分集列表"
                  onClick={() => setIsPageListOpen(false)}
                  className={clsx(
                    "absolute inset-0 z-[45] transition-opacity duration-300 ease-out",
                    mobileModalBackdropClassName,
                    isPageListOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
                  )}
                />
              )}

              <div
                ref={controlsRef}
                className={clsx(
                  "absolute inset-x-0 bottom-0 z-40 transform transition-[transform,opacity] duration-300 ease-out",
                  isMobile
                    ? mobileControlsStateClassName
                    : isUiVisible
                      ? "pointer-events-auto translate-y-0 opacity-100 blur-0"
                      : "pointer-events-none translate-y-full opacity-0 blur-0",
                )}
              >
                <div
                  className={clsx(
                    "mx-auto flex w-full flex-col items-center gap-2.5",
                    isMobile ? mobileControlsSurfaceClassName : "mb-4 max-w-6xl px-12",
                  )}
                >
                  {isMobile ? (
                    <>
                      <MobileVolumeControl isDark={isPlayerDark} />
                      <MusicPlayProgress
                        className="w-full"
                        trackClassName={mobileProgressTrackClassName}
                        timeClassName={mobileProgressTimeClassName}
                        thumbClassName="h-3 w-3"
                      />
                      <div className="flex w-full items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <MusicPlayMode className={mobileSecondaryControlClassName} iconSize={18} tooltipPlacement="top-start" />
                          {playItem.hasMultiPart && (
                            <Button
                              radius="full"
                              size="sm"
                              variant="flat"
                              onPress={() => setIsPageListOpen(open => !open)}
                              className={clsx(
                                "h-10 min-w-[58px] px-3 text-[11px] font-medium shadow-none",
                                isPageListOpen
                                  ? isPlayerDark
                                    ? "border border-white/25 bg-white text-black hover:bg-white/92"
                                    : "border border-slate-900/10 bg-slate-950 text-white hover:bg-slate-900"
                                  : isPlayerDark
                                    ? "border border-white/10 bg-white/10 text-white hover:bg-white/16"
                                    : "border border-slate-900/8 bg-white/82 text-slate-900 hover:bg-white",
                              )}
                            >
                              分集
                            </Button>
                          )}
                        </div>
                        <MusicPlayControl
                          className="flex-1 justify-center space-x-4"
                          secondaryButtonClassName={mobileSecondaryControlClassName}
                          primaryButtonClassName={mobilePrimaryControlClassName}
                          secondaryIconSize={22}
                          primaryIconSize={52}
                        />
                        <OpenPlaylistDrawerButton className={mobileSecondaryControlClassName} iconSize={18} tooltip="播放列表" />
                      </div>
                    </>
                  ) : (
                    <>
                      <MusicPlayProgress className="w-full" trackClassName="h-[6px]" />
                      <div className="flex w-full items-center justify-center space-x-4">
                        <MusicPlayMode />
                        <MusicPlayControl />
                        <OpenPlaylistDrawerButton />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {!isMobile && isUiVisible && playItem.hasMultiPart && !isPageListOpen && (
                <div className="absolute top-1/2 right-0 z-20 -translate-y-1/2">
                  <IconButton
                    className="h-24 w-6 min-w-0 rounded-l-xl rounded-r-none bg-white/10 px-0 backdrop-blur-md transition-colors hover:bg-white/20"
                    onPress={() => setIsPageListOpen(!isPageListOpen)}
                    tooltip="显示分集列表"
                    tooltipProps={{
                      placement: "left",
                    }}
                  >
                    <RiArrowLeftSLine size={24} className="text-white/80" />
                  </IconButton>
                </div>
              )}

              <PageList
                ref={pageListRef}
                className={clsx(
                  "absolute z-50 origin-bottom transition-all duration-300 ease-out",
                  isMobile ? "right-4 left-4 rounded-[28px]" : "top-1/2 right-0 -translate-y-1/2 rounded-r-none",
                  isPageListOpen
                    ? isMobile
                      ? "translate-y-0 scale-100 opacity-100"
                      : "translate-x-0 opacity-100"
                    : isMobile
                      ? "pointer-events-none translate-y-6 scale-[0.98] opacity-0"
                      : "pointer-events-none translate-x-full opacity-0",
                )}
                style={{
                  width: isMobile ? undefined : 280,
                  bottom: isMobile ? `calc(var(--safe-area-bottom) + ${controlsHeight + 12}px)` : undefined,
                  height: isMobile ? "min(48vh, 420px)" : "min(60vh, 420px)",
                }}
                isMobile={isMobile}
                onClose={() => setIsPageListOpen(false)}
              />
            </DrawerBody>
          )
        }
      </DrawerContent>
    </Drawer>
  );
};

export default FullScreenPlayer;
