import React, { memo, Suspense, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";

import { Button, Drawer, DrawerBody, DrawerContent, DrawerHeader, useDisclosure } from "@heroui/react";
import {
  RiCompass3Line,
  RiDiscLine,
  RiHistoryLine,
  RiMenuLine,
  RiMusic2Line,
  RiPauseCircleFill,
  RiPlayCircleFill,
  RiSearchLine,
  RiFolderMusicLine,
  RiSettings3Line,
  RiSkipForwardFill,
  RiTimeLine,
  RiUserFollowLine,
  RiUserLine,
  RiLogoutBoxRLine,
} from "@remixicon/react";
import clsx from "classnames";
import { useShallow } from "zustand/shallow";

import { ReactComponent as LogoIcon } from "@/assets/icons/logo.svg";
import { DefaultMenuList } from "@/common/constants/menus";
import { clearRuntimeLoginCookies } from "@/common/utils/runtime-cookie";
import { getRuntimeCookie } from "@/common/utils/runtime-cookie";
import { formatUrlProtocol } from "@/common/utils/url";
import IconButton from "@/components/icon-button";
import MusicPlayProgress from "@/components/music-play-progress";
import { useTheme } from "@/components/theme/use-theme";
import { postPassportLoginExit } from "@/service/passport-login-exit";
import { useFavoritesStore } from "@/store/favorite";
import { useModalStore } from "@/store/modal";
import { usePlayList } from "@/store/play-list";
import { useSettings } from "@/store/settings";
import { useUser } from "@/store/user";

const Login = React.lazy(() => import("@/layout/navbar/login"));

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
    "size-11 min-w-11 rounded-full transition-transform duration-150 active:scale-95",
    isDark ? "bg-white/10 text-white hover:bg-white/16" : "bg-slate-900/6 text-slate-700 hover:bg-slate-900/10",
  );

  return (
    <div className="flex min-h-16 items-center gap-2 px-3 py-2">
      <button
        type="button"
        aria-label={`打开播放器：${displayTitle}`}
        onClick={openFullScreenPlayer}
        className="active:bg-default-100/60 flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-lg text-left transition-colors"
      >
        <div
          className={clsx(
            "flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-lg",
            isDark ? "bg-white/10" : "bg-slate-900/6",
          )}
        >
          {cover ? (
            <img src={cover} alt="" className="h-full w-full object-cover" decoding="async" />
          ) : (
            <RiMusic2Line size={18} className={isDark ? "text-white/60" : "text-slate-500"} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={clsx("truncate text-sm leading-tight font-semibold", isDark ? "text-white" : "text-slate-900")}
          >
            {displayTitle}
          </div>
          <div className={clsx("mt-1 truncate text-xs leading-tight", isDark ? "text-white/55" : "text-slate-600/70")}>
            {displaySubtitle}
          </div>
        </div>
      </button>
      <div className="flex items-center gap-1">
        <IconButton aria-label={isPlaying ? "暂停" : "播放"} onPress={togglePlay} className={btnClass}>
          {isPlaying ? <RiPauseCircleFill size={24} /> : <RiPlayCircleFill size={24} />}
        </IconButton>
        <IconButton aria-label="下一首" onPress={next} className={btnClass}>
          <RiSkipForwardFill size={18} />
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
  const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure();
  const {
    isOpen: isLoginOpen,
    onOpen: onLoginOpen,
    onClose: onLoginClose,
    onOpenChange: onLoginOpenChange,
  } = useDisclosure();
  const {
    isOpen: isUserMenuOpen,
    onOpen: onUserMenuOpen,
    onClose: onUserMenuClose,
    onOpenChange: onUserMenuOpenChange,
  } = useDisclosure();
  const currentPlayItem = usePlayList(state => state.list.find(item => item.id === state.playId));

  const title = getPageTitle(location.pathname);
  const isHome = location.pathname === "/";
  const subtitle = getPageSubtitle(location.pathname, Boolean(currentPlayItem));
  const isDarkTheme = theme === "dark";
  const shellMutedTextClassName = isDarkTheme ? "text-white/62" : "text-slate-700/72";
  const shellChromeButtonClassName = isDarkTheme
    ? "bg-white/8 text-white hover:bg-white/14"
    : "bg-slate-900/6 text-slate-700 hover:bg-slate-900/10 hover:text-slate-950";
  const shellChipClassName = isDarkTheme
    ? "text-white/72 hover:bg-white/8 hover:text-white"
    : "text-slate-600 hover:bg-slate-900/6 hover:text-slate-950";
  const shellSurfaceClassName = isDarkTheme
    ? "border-white/8 bg-[color:var(--mobile-shell-bg)] text-white"
    : "border-slate-900/8 bg-[color:var(--mobile-shell-bg)] text-slate-900";

  useEffect(() => {
    if (!user?.mid) {
      return;
    }

    void updateCreatedFavorites(user.mid);
    void updateCollectedFavorites(user.mid);
  }, [updateCollectedFavorites, updateCreatedFavorites, user?.mid]);

  useEffect(() => {
    const handleOverlayCloseRequest = (event: Event) => {
      const closeRequest = event as CustomEvent<{ handled: boolean }>;

      if (isLoginOpen) {
        closeRequest.detail.handled = true;
        onLoginClose();
        return;
      }

      if (isUserMenuOpen) {
        closeRequest.detail.handled = true;
        onUserMenuClose();
        return;
      }

      if (isOpen) {
        closeRequest.detail.handled = true;
        onClose();
      }
    };

    window.addEventListener("biuclosemobileoverlay", handleOverlayCloseRequest);
    return () => window.removeEventListener("biuclosemobileoverlay", handleOverlayCloseRequest);
  }, [isLoginOpen, isOpen, isUserMenuOpen, onClose, onLoginClose, onUserMenuClose]);

  const menuItems = useMemo(() => {
    const items = [...DefaultMenuList, ...extraMenuItems].filter(
      item => !item.href || !hiddenMenuKeys.includes(item.href),
    );

    return items.filter(item => (item.needLogin ? Boolean(user?.isLogin) : true));
  }, [hiddenMenuKeys, user?.isLogin]);

  const handleLogout = async () => {
    try {
      const biliJct = await getRuntimeCookie("bili_jct");
      if (biliJct) {
        await postPassportLoginExit({ biliCSRF: biliJct }).catch(() => {});
      }
    } catch {
      // ignore API errors
    }
    await clearRuntimeLoginCookies();
    useUser.getState().clear();
    onOpenChange();
  };

  const visibleCreatedFavorites = useMemo(
    () => createdFavorites.filter(item => !hiddenMenuKeys.includes(String(item.id))),
    [createdFavorites, hiddenMenuKeys],
  );

  const visibleCollectedFavorites = useMemo(
    () => collectedFavorites.filter(item => !hiddenMenuKeys.includes(String(item.id))),
    [collectedFavorites, hiddenMenuKeys],
  );

  return (
    <div
      className="text-foreground flex h-full min-h-0 flex-col overflow-hidden bg-[var(--mobile-shell-bg)]"
      style={{ paddingLeft: "var(--safe-area-left)", paddingRight: "var(--safe-area-right)" }}
    >
      <header
        className={clsx("flex-none border-b px-4", shellSurfaceClassName)}
        style={{ paddingTop: "var(--safe-area-top)" }}
      >
        <div className="flex min-h-[68px] items-center gap-3">
          <Button
            isIconOnly
            aria-label="打开导航"
            variant="light"
            radius="full"
            onPress={onOpen}
            className={clsx("size-11 min-w-11", shellChromeButtonClassName)}
          >
            <RiMenuLine size={22} />
          </Button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {isHome ? <LogoIcon className="text-primary h-5 w-5 flex-none" aria-hidden="true" /> : null}
              <h1 className="truncate text-xl font-semibold">{title}</h1>
            </div>
            <p className={clsx("mt-0.5 truncate text-xs", shellMutedTextClassName)}>{subtitle}</p>
          </div>

          {user?.isLogin && user.face ? (
            <button
              type="button"
              aria-label={`打开${user.uname || "用户"}菜单`}
              onClick={onUserMenuOpen}
              className="border-primary/25 size-11 flex-none overflow-hidden rounded-full border-2 transition-transform duration-150 active:scale-95"
            >
              <img
                src={user.face.replace(/^http:/, "https:")}
                alt=""
                className="h-full w-full object-cover"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={onLoginOpen}
              className={clsx(
                "flex min-h-11 flex-none items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium transition-transform duration-150 active:scale-95",
                shellChipClassName,
              )}
            >
              <RiUserLine size={18} />
              <span>登录</span>
            </button>
          )}
        </div>

        {isHome ? (
          <nav aria-label="快捷入口" className="grid grid-cols-4 gap-1 pb-3">
            {homeShortcutItems.map(item => {
              const Icon = item.icon;

              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => navigate(item.href)}
                  className={clsx(
                    "active:bg-primary/15 flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg px-1 text-xs font-medium transition-colors",
                    shellChipClassName,
                  )}
                >
                  <Icon size={17} className="flex-none" />
                  <span className="truncate">{item.title}</span>
                </button>
              );
            })}
          </nav>
        ) : null}
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>

      <div className={clsx("flex-none border-t", shellSurfaceClassName)}>
        {currentPlayItem ? (
          <>
            <MobileMiniPlayer isDark={isDarkTheme} />
            <MusicPlayProgress
              className="w-full flex-none"
              trackClassName={isDarkTheme ? "h-[2px] bg-white/8" : "h-[2px] bg-slate-900/6"}
              thumbClassName="h-0 w-0"
              timeClassName="hidden"
            />
          </>
        ) : null}

        <nav
          aria-label="主要导航"
          className="grid grid-cols-3 gap-1 px-2 pt-1.5"
          style={{ paddingBottom: "calc(var(--safe-area-bottom) + 0.375rem)" }}
        >
          {bottomNavItems.map(item => {
            const active = isPathActive(location.pathname, item.href);
            const Icon = item.icon;

            return (
              <button
                key={item.href}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => navigate(item.href)}
                className={clsx(
                  "active:bg-primary/15 flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] transition-colors",
                  active
                    ? "bg-primary/12 text-primary"
                    : isDarkTheme
                      ? "text-white/58 hover:bg-white/6 hover:text-white"
                      : "text-slate-500 hover:bg-slate-900/4 hover:text-slate-950",
                )}
              >
                <Icon size={20} />
                <span className="truncate font-medium">{item.title}</span>
              </button>
            );
          })}
        </nav>
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

      {isLoginOpen ? (
        <Suspense fallback={null}>
          <Login isOpen={isLoginOpen} onOpenChange={onLoginOpenChange} />
        </Suspense>
      ) : null}

      {/* User Menu Drawer */}
      <Drawer
        isOpen={isUserMenuOpen}
        onOpenChange={onUserMenuOpenChange}
        placement="bottom"
        size="sm"
        shouldBlockScroll={false}
      >
        <DrawerContent>
          <DrawerBody className="px-4 py-4">
            {user && (
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onUserMenuOpenChange();
                    navigate(`/user/${user.mid}`);
                  }}
                  className="hover:bg-default-100 active:bg-default-200 flex items-center gap-3 rounded-xl p-3 transition-colors"
                >
                  <img
                    src={user.face?.replace(/^http:/, "https:")}
                    alt={user.uname || "avatar"}
                    className="h-12 w-12 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="truncate text-base font-semibold">{user.uname}</div>
                    <div className="text-foreground-500 text-sm">UID: {user.mid}</div>
                  </div>
                </button>
                <div className="bg-divider h-px" />
                <Button
                  variant="light"
                  color="danger"
                  startContent={<RiLogoutBoxRLine size={18} />}
                  className="w-full justify-start"
                  onPress={() => {
                    handleLogout();
                    onUserMenuOpenChange();
                  }}
                >
                  退出登录
                </Button>
              </div>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default MobileShell;
