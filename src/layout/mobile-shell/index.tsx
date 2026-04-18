import React, { memo, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";

import { Button, Drawer, DrawerBody, DrawerContent, DrawerHeader, useDisclosure } from "@heroui/react";
import {
  RiArrowLeftSLine,
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
import OpenPlaylistDrawerButton from "@/components/open-playlist-drawer-button";
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

const MobileMiniPlayer = memo(() => {
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
  const miniPlayerBadge = playItem.source === "local" ? "本地" : playItem.type === "audio" ? "音频" : "视频音频";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[26px] border border-white/10 bg-white/8 px-3.5 py-3 shadow-[0_18px_50px_rgb(2_6_23_/_0.28)] backdrop-blur-2xl"
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/8 to-transparent" />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={openFullScreenPlayer}
          className="flex min-w-0 flex-1 items-center gap-3.5 text-left"
        >
          <div className="flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-[18px] border border-white/12 bg-white/8 shadow-lg shadow-black/10">
            {cover ? (
              <img src={cover} alt={displayTitle} className="h-full w-full object-cover" />
            ) : (
              <RiMusic2Line />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <div className="truncate text-[10px] font-medium tracking-[0.22em] text-white/58 uppercase">Now Playing</div>
              <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/72">
                {miniPlayerBadge}
              </span>
            </div>
            <div className="truncate text-sm font-semibold text-white">{displayTitle}</div>
            <div className="mt-0.5 truncate text-xs text-white/62">{displaySubtitle}</div>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <IconButton
            onPress={togglePlay}
            className="size-11 min-w-11 rounded-full bg-white/10 text-white hover:bg-white/16 hover:text-white"
          >
            {isPlaying ? <RiPauseCircleFill size={30} /> : <RiPlayCircleFill size={30} />}
          </IconButton>
          <IconButton onPress={next} className="size-11 min-w-11 rounded-full bg-white/10 text-white hover:bg-white/16 hover:text-white">
            <RiSkipForwardFill size={20} />
          </IconButton>
          <OpenPlaylistDrawerButton
            className="size-11 min-w-11 rounded-full bg-white/10 text-white hover:bg-white/16 hover:text-white"
            iconSize={20}
            tooltip="播放列表"
          />
        </div>
      </div>
      <MusicPlayProgress
        className="mt-3 w-full"
        trackClassName="h-[3.5px] bg-white/12"
        timeClassName="text-[10px] text-white/50"
        thumbClassName="h-3 w-3"
      />
    </motion.div>
  );
});

const MobileShell = ({ children }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUser(s => s.user);
  const createdFavorites = useFavoritesStore(s => s.createdFavorites);
  const collectedFavorites = useFavoritesStore(s => s.collectedFavorites);
  const updateCreatedFavorites = useFavoritesStore(s => s.updateCreatedFavorites);
  const updateCollectedFavorites = useFavoritesStore(s => s.updateCollectedFavorites);
  const hiddenMenuKeys = useSettings(s => s.hiddenMenuKeys);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const currentPlayItem = usePlayList(state => state.list.find(item => item.id === state.playId));

  const canGoBack = (window.history?.state?.idx ?? 0) > 0;
  const title = getPageTitle(location.pathname);
  const isHome = location.pathname === "/";
  const currentCover = formatUrlProtocol(currentPlayItem?.pageCover || currentPlayItem?.cover);
  const subtitle = getPageSubtitle(location.pathname, Boolean(currentPlayItem));

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
            className="rounded-[28px] border border-white/10 bg-white/8 px-3 py-3 shadow-[0_18px_60px_rgb(2_6_23_/_0.24)] backdrop-blur-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="flex flex-none items-center justify-start">
                {canGoBack ? (
                  <Button
                    isIconOnly
                    variant="light"
                    radius="full"
                    onPress={() => navigate(-1)}
                    className="bg-white/8 text-white hover:bg-white/14"
                  >
                    <RiArrowLeftSLine size={20} />
                  </Button>
                ) : (
                  <Button
                    isIconOnly
                    variant="light"
                    radius="full"
                    onPress={onOpen}
                    className="bg-white/8 text-white hover:bg-white/14"
                  >
                    <RiMenuLine size={20} />
                  </Button>
                )}
              </div>
              <div className="min-w-0 flex-1">
                {isHome ? (
                  <>
                    <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] font-medium tracking-[0.24em] text-white/72 uppercase">
                      <LogoIcon className="text-primary h-4 w-4" />
                      <span>Biu Mobile</span>
                    </div>
                    <div className="text-2xl font-semibold tracking-tight">推荐</div>
                  </>
                ) : (
                  <>
                    <div className="text-[10px] font-medium tracking-[0.26em] text-white/58 uppercase">Workspace</div>
                    <div className="truncate text-xl font-semibold tracking-tight">{title}</div>
                  </>
                )}
                <div className="mt-1 truncate text-sm text-white/62">{subtitle}</div>
              </div>
              <div className="flex flex-none items-center justify-end rounded-full border border-white/10 bg-white/8 p-1 shadow-lg shadow-black/10">
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
                      className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm text-white/72 transition-all duration-200 hover:bg-white/10 hover:text-white"
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

        <div className="min-h-0 flex-1 px-2">
          <div className="bg-background/78 relative flex h-full min-h-0 flex-col overflow-hidden rounded-t-[30px] border border-white/10 shadow-[0_26px_70px_rgb(2_6_23_/_0.24)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-white/8 to-transparent" />
            <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
          </div>
        </div>

        <div
          className="relative z-20 flex-none px-2 pt-2"
          style={{ paddingBottom: "calc(0.5rem + var(--safe-area-bottom))" }}
        >
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, ease: "easeOut", delay: 0.08 }}
            className="rounded-[30px] border border-white/10 bg-[var(--mobile-shell-panel)] px-2 py-2 shadow-[0_24px_70px_rgb(2_6_23_/_0.34)] backdrop-blur-3xl"
          >
            <MobileMiniPlayer />
            <nav className="mt-2 grid grid-cols-5 gap-1 px-1 pb-1">
              {bottomNavItems.map(item => {
                const active = isPathActive(location.pathname, item.href);
                const Icon = item.icon;

                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => navigate(item.href)}
                    className={clsx(
                      "flex min-w-0 flex-col items-center justify-center gap-1 rounded-[18px] px-1 py-2 text-[11px] transition-all duration-200",
                      active
                        ? "bg-white text-slate-950 shadow-[0_10px_24px_rgb(255_255_255_/_0.18)]"
                        : "text-white/62 hover:bg-white/6 hover:text-white",
                    )}
                  >
                    <Icon size={20} />
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
