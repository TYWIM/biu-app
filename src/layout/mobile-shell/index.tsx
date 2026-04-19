import React, { memo, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";

import { Button, Drawer, DrawerBody, DrawerContent, DrawerHeader, useDisclosure } from "@heroui/react";
import {
  RiCompass3Line,
  RiDiscLine,
  RiFileDownloadLine,
  RiFolderMusicLine,
  RiHistoryLine,
  RiMenuLine,
  RiMusic2Line,
  RiPauseCircleFill,
  RiPlayCircleFill,
  RiSearchLine,
  RiSettings3Line,
  RiSkipForwardFill,
  RiTimeLine,
  RiUserFollowLine,
} from "@remixicon/react";
import clsx from "classnames";
import { motion } from "framer-motion";
import { useShallow } from "zustand/shallow";

import { ReactComponent as LogoIcon } from "@/assets/icons/logo.svg";
import { DefaultMenuList } from "@/common/constants/menus";
import { formatUrlProtocol } from "@/common/utils/url";
import IconButton from "@/components/icon-button";
import MusicPlayProgress from "@/components/music-play-progress";
import { useTheme } from "@/components/theme/use-theme";
import UserCard from "@/layout/navbar/user";
import { useFavoritesStore } from "@/store/favorite";
import { useModalStore } from "@/store/modal";
import { usePlayList } from "@/store/play-list";
import { useSettings } from "@/store/settings";
import { useUser } from "@/store/user";

interface Props {
  children?: React.ReactNode;
}

interface NavItem {
  href: string;
  title: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  needLogin?: boolean;
}

const bottomNavItems: NavItem[] = [
  {
    href: "/",
    title: "首页",
    icon: RiDiscLine,
  },
  {
    href: "/search",
    title: "搜索",
    icon: RiSearchLine,
  },
  {
    href: "/local-music",
    title: "本地",
    icon: RiFolderMusicLine,
  },
  {
    href: "/download-list",
    title: "下载",
    icon: RiFileDownloadLine,
  },
  {
    href: "/settings",
    title: "设置",
    icon: RiSettings3Line,
  },
];

const extraMenuItems: NavItem[] = [
  {
    href: "/search",
    title: "搜索",
    icon: RiSearchLine,
  },
  {
    href: "/settings",
    title: "设置",
    icon: RiSettings3Line,
  },
];

const homeShortcutItems: NavItem[] = [
  {
    href: "/follow",
    title: "关注",
    icon: RiUserFollowLine,
  },
  {
    href: "/later",
    title: "稍后",
    icon: RiTimeLine,
  },
  {
    href: "/history",
    title: "历史",
    icon: RiHistoryLine,
  },
  {
    href: "/dynamic-feed",
    title: "动态",
    icon: RiCompass3Line,
  },
];

const getPageTitle = (pathname: string) => {
  if (pathname === "/") return "推荐";
  if (pathname.startsWith("/search")) return "搜索";
  if (pathname.startsWith("/follow")) return "我的关注";
  if (pathname.startsWith("/later")) return "稍后再看";
  if (pathname.startsWith("/history")) return "历史记录";
  if (pathname.startsWith("/local-music")) return "本地音乐";
  if (pathname.startsWith("/download-list")) return "下载记录";
  if (pathname.startsWith("/dynamic-feed")) return "动态";
  if (pathname.startsWith("/collection/")) return "收藏夹";
  if (pathname.startsWith("/user/")) return "用户";
  if (pathname.startsWith("/settings")) return "设置";
  return "Biu";
};

const getPageSubtitle = (pathname: string, hasPlayingItem: boolean) => {
  if (pathname === "/") return hasPlayingItem ? "继续当前播放队列" : "发现、收藏和下载都在这里";
  if (pathname.startsWith("/search")) return "搜索视频、音乐和创作者";
  if (pathname.startsWith("/follow")) return "查看关注更新和新内容";
  if (pathname.startsWith("/later")) return "管理稍后播放与待整理内容";
  if (pathname.startsWith("/history")) return "快速回到最近播放记录";
  if (pathname.startsWith("/local-music")) return "浏览设备里的本地音乐";
  if (pathname.startsWith("/download-list")) return "管理下载任务与离线资源";
  if (pathname.startsWith("/dynamic-feed")) return "集中查看动态与更新";
  if (pathname.startsWith("/collection/")) return "整理收藏夹与播放队列";
  if (pathname.startsWith("/user/")) return "用户主页与投稿信息";
  if (pathname.startsWith("/settings")) return "主题、播放和系统偏好";
  return hasPlayingItem ? "继续当前播放队列" : "移动端音乐工作区";
};

const isPathActive = (pathname: string, href: string) => {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

const MobileMiniPlayer = memo(({ isDark }: { isDark: boolean }) => {
  const { playItem, next, togglePlay, isPlaying } = usePlayList(
    useShallow(state => ({
      playItem: state.list.find(item => item.id === state.playId),
      next: state.next,
      togglePlay: state.togglePlay,
      isPlaying: state.isPlaying,
    })),
  );
  const openFullScreenPlayer = useModalStore(s => s.openFullScreenPlayer);

  const cover = formatUrlProtocol(playItem?.pageCover || playItem?.cover);

  if (!playItem) {
    return null;
  }

  const displayTitle = playItem.pageTitle || playItem.title;
  const displaySubtitle = playItem.source === "local" ? "本地音乐" : playItem.ownerName || "未知作者";
  const btnClass = clsx(
    "size-8 min-w-8 rounded-full transition-transform duration-150 active:scale-90",
    isDark
      ? "bg-white/10 text-white hover:bg-white/16"
      : "bg-slate-900/6 text-slate-700 hover:bg-slate-900/10",
  );

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5">
      <button
        type="button"
        onClick={openFullScreenPlayer}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left transition-transform duration-150 active:scale-[0.97]"
      >
        <div className={clsx(
          "flex h-8 w-8 flex-none items-center justify-center overflow-hidden rounded-lg",
          isDark ? "bg-white/10" : "bg-slate-900/6",
        )}>
          {cover ? (
            <img src={cover} alt={displayTitle} className="h-full w-full object-cover" />
          ) : (
            <RiMusic2Line size={14} className={isDark ? "text-white/60" : "text-slate-500"} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className={clsx("truncate text-[12px] font-semibold leading-tight", isDark ? "text-white" : "text-slate-900")}>{displayTitle}</div>
          <div className={clsx("truncate text-[10px] leading-tight", isDark ? "text-white/55" : "text-slate-600/70")}>{displaySubtitle}</div>
        </div>
      </button>
      <div className="flex items-center gap-1">
        <IconButton onPress={togglePlay} className={btnClass}>
          {isPlaying ? <RiPauseCircleFill size={22} /> : <RiPlayCircleFill size={22} />}
        </IconButton>
        <IconButton onPress={next} className={btnClass}>
          <RiSkipForwardFill size={15} />
        </IconButton>
      </div>
    </div>
  );
});

const MobileShell = ({ children }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const user = useUser(s => s.user);
  const createdFavorites = useFavoritesStore(s => s.createdFavorites);
  const collectedFavorites = useFavoritesStore(s => s.collectedFavorites);
  const updateCreatedFavorites = useFavoritesStore(s => s.updateCreatedFavorites);
  const updateCollectedFavorites = useFavoritesStore(s => s.updateCollectedFavorites);
  const hiddenMenuKeys = useSettings(s => s.hiddenMenuKeys);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const currentPlayItem = usePlayList(state => state.list.find(item => item.id === state.playId));

  const title = getPageTitle(location.pathname);
  const isHome = location.pathname === "/";
  const currentCover = formatUrlProtocol(currentPlayItem?.pageCover || currentPlayItem?.cover);
  const subtitle = getPageSubtitle(location.pathname, Boolean(currentPlayItem));
  const isDarkTheme = theme === "dark";
  const shellCardClassName = isDarkTheme
    ? "border-white/10 bg-white/8 text-white shadow-[0_18px_60px_rgb(2_6_23_/_0.24)]"
    : "border-slate-900/8 bg-white/82 text-slate-900 shadow-[0_18px_54px_rgb(148_163_184_/_0.16)]";
  const shellMutedTextClassName = isDarkTheme ? "text-white/62" : "text-slate-700/72";
  const shellSubtleLabelClassName = isDarkTheme ? "text-white/58" : "text-slate-700/56";
  const shellChromeButtonClassName = isDarkTheme
    ? "bg-white/8 text-white hover:bg-white/14"
    : "bg-slate-900/6 text-slate-700 hover:bg-slate-900/10 hover:text-slate-950";
  const shellChipClassName = isDarkTheme
    ? "border-white/10 bg-white/8 text-white/72"
    : "border-slate-900/8 bg-slate-900/4 text-slate-700/72";
  const shellSeparatorClassName = isDarkTheme ? "bg-white/8" : "bg-slate-900/6";

  useEffect(() => {
    if (!user?.mid) {
      return;
    }

    void updateCreatedFavorites(user.mid);
    void updateCollectedFavorites(user.mid);
  }, [updateCollectedFavorites, updateCreatedFavorites, user?.mid]);

  const menuItems = useMemo(() => {
    const items = [...DefaultMenuList, ...extraMenuItems].filter(
      item => !item.href || !hiddenMenuKeys.includes(item.href),
    );

    return items.filter(item => (item.needLogin ? Boolean(user?.isLogin) : true));
  }, [hiddenMenuKeys, user?.isLogin]);

  const visibleCreatedFavorites = useMemo(
    () => createdFavorites.filter(item => !hiddenMenuKeys.includes(String(item.id))),
    [createdFavorites, hiddenMenuKeys],
  );

  const visibleCollectedFavorites = useMemo(
    () => collectedFavorites.filter(item => !hiddenMenuKeys.includes(String(item.id))),
    [collectedFavorites, hiddenMenuKeys],
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[var(--mobile-shell-bg)]">
      <div className="mobile-shell-backdrop">
        {currentCover ? (
          <img
            src={currentCover}
            alt={currentPlayItem?.pageTitle || currentPlayItem?.title || "cover"}
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-24 blur-3xl saturate-125"
          />
        ) : null}
        <div className="mobile-shell-ambient mobile-shell-ambient-a" />
        <div className="mobile-shell-ambient mobile-shell-ambient-b" />
        <div className="mobile-shell-ambient mobile-shell-ambient-c" />
        <div className="mobile-shell-noise" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <header className="px-3 pb-3" style={{ paddingTop: "calc(var(--safe-area-top) + 0.75rem)" }}>
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className={clsx("rounded-[28px] border px-3 py-3 backdrop-blur-2xl", shellCardClassName)}
          >
            <div className="flex items-start gap-3">
              <div className="flex flex-none items-center justify-start">
                <Button
                  isIconOnly
                  variant="light"
                  radius="full"
                  onPress={onOpen}
                  className={shellChromeButtonClassName}
                >
                  <RiMenuLine size={20} />
                </Button>
              </div>
              <div className="min-w-0 flex-1">
                {isHome ? (
                  <>
                    <div className={clsx("mb-1 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-[0.24em] uppercase", shellChipClassName)}>
                      <LogoIcon className="text-primary h-4 w-4" />
                      <span>Biu Mobile</span>
                    </div>
                    <div className="text-2xl font-semibold tracking-tight">推荐</div>
                  </>
                ) : (
                  <>
                    <div className={clsx("text-[10px] font-medium tracking-[0.26em] uppercase", shellSubtleLabelClassName)}>Workspace</div>
                    <div className="truncate text-xl font-semibold tracking-tight">{title}</div>
                  </>
                )}
                <div className={clsx("mt-1 truncate text-sm", shellMutedTextClassName)}>{subtitle}</div>
              </div>
              <div className={clsx("flex flex-none items-center justify-end rounded-full border p-1", shellChipClassName)}>
                <UserCard />
              </div>
            </div>

            {isHome && (
              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
                {homeShortcutItems.map(item => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => navigate(item.href)}
                      className={clsx(
                        "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all duration-200 active:scale-95",
                        shellChipClassName,
                        isDarkTheme ? "hover:bg-white/10 hover:text-white" : "hover:bg-slate-900/8 hover:text-slate-950",
                      )}
                    >
                      <Icon size={16} />
                      <span>{item.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        </header>

        <div
          className="flex min-h-0 flex-1 flex-col px-2"
          style={{ paddingBottom: "calc(0.5rem + var(--safe-area-bottom))" }}
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.06 }}
            className={clsx(
              "flex min-h-0 flex-1 flex-col overflow-hidden rounded-[26px] border backdrop-blur-2xl",
              isDarkTheme
                ? "bg-background/78 border-white/10 shadow-[0_26px_70px_rgb(2_6_23_/_0.24)]"
                : "bg-white/76 border-[color:var(--mobile-shell-border)] shadow-[0_22px_54px_rgb(148_163_184_/_0.16)]",
            )}
          >
            <div className={clsx("pointer-events-none absolute inset-x-0 top-0 z-10 h-16 rounded-t-[26px] bg-linear-to-b", isDarkTheme ? "from-white/8 to-transparent" : "from-white/55 to-transparent")} />
            <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>

            <div className={clsx("mx-3 h-px flex-none", shellSeparatorClassName)} />
            <MobileMiniPlayer isDark={isDarkTheme} />
            <MusicPlayProgress
              className="w-full flex-none"
              trackClassName={isDarkTheme ? "h-[2px] bg-white/8" : "h-[2px] bg-slate-900/6"}
              thumbClassName="h-0 w-0"
              timeClassName="hidden"
            />

            <nav className="grid flex-none grid-cols-5 gap-1 px-2 py-1.5">
              {bottomNavItems.map(item => {
                const active = isPathActive(location.pathname, item.href);
                const Icon = item.icon;

                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => navigate(item.href)}
                    className={clsx(
                      "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[14px] px-1 py-1.5 text-[10px] transition-all duration-200 active:scale-90",
                      active
                        ? isDarkTheme
                          ? "bg-white text-slate-950 shadow-[0_8px_20px_rgb(255_255_255_/_0.16)]"
                          : "bg-slate-950 text-white shadow-[0_8px_20px_rgb(15_23_42_/_0.16)]"
                        : isDarkTheme
                          ? "text-white/55 hover:bg-white/6 hover:text-white"
                          : "text-slate-500 hover:bg-slate-900/4 hover:text-slate-950",
                    )}
                  >
                    <Icon size={17} />
                    <span className="truncate font-medium">{item.title}</span>
                  </button>
                );
              })}
            </nav>
          </motion.div>
        </div>
      </div>

      <Drawer isOpen={isOpen} onOpenChange={onOpenChange} placement="left" size="xs" shouldBlockScroll={false}>
        <DrawerContent>
          <DrawerHeader className="border-divider/40 flex items-center gap-2 border-b px-4 py-3">
            <LogoIcon className="text-primary h-6 w-6" />
            <span className="text-base font-semibold">导航</span>
          </DrawerHeader>
          <DrawerBody className="px-3 py-3">
            <div className="flex flex-col gap-2">
              {menuItems.map(item => {
                const active = item.href ? isPathActive(location.pathname, item.href) : false;
                const Icon = item.icon;

                return (
                  <Button
                    key={item.href ?? item.title}
                    variant={active ? "solid" : "light"}
                    color={active ? "primary" : "default"}
                    startContent={Icon ? <Icon size={18} /> : undefined}
                    className="justify-start"
                    onPress={() => {
                      if (item.href) {
                        navigate(item.href);
                      }
                      onOpenChange();
                    }}
                  >
                    {item.title}
                  </Button>
                );
              })}

              {Boolean(user?.isLogin && visibleCreatedFavorites.length) && (
                <div className="mt-3 flex flex-col gap-2">
                  <div className="text-foreground-500 px-2 text-xs">我创建的</div>
                  {visibleCreatedFavorites.map(item => {
                    const href = `/collection/${item.id}?mid=${item.mid}`;
                    const active = isPathActive(location.pathname, `/collection/${item.id}`);

                    return (
                      <Button
                        key={`created-${item.id}`}
                        variant={active ? "solid" : "light"}
                        color={active ? "primary" : "default"}
                        startContent={<RiFolderMusicLine size={18} />}
                        className="justify-start"
                        onPress={() => {
                          navigate(href);
                          onOpenChange();
                        }}
                      >
                        <span className="truncate">{item.title}</span>
                      </Button>
                    );
                  })}
                </div>
              )}

              {Boolean(user?.isLogin && visibleCollectedFavorites.length) && (
                <div className="mt-3 flex flex-col gap-2">
                  <div className="text-foreground-500 px-2 text-xs">我收藏的</div>
                  {visibleCollectedFavorites.map(item => {
                    const href = `/collection/${item.id}?type=${item.type}&mid=${item.mid}`;
                    const active = isPathActive(location.pathname, `/collection/${item.id}`);

                    return (
                      <Button
                        key={`collected-${item.id}`}
                        variant={active ? "solid" : "light"}
                        color={active ? "primary" : "default"}
                        startContent={<RiFolderMusicLine size={18} />}
                        className="justify-start"
                        onPress={() => {
                          navigate(href);
                          onOpenChange();
                        }}
                      >
                        <span className="truncate">{item.title}</span>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default MobileShell;
