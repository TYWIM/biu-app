import React, { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";

import { Button, Drawer, DrawerBody, DrawerContent, DrawerHeader, useDisclosure } from "@heroui/react";
import {
  RiArrowLeftSLine,
  RiDiscLine,
  RiFileDownloadLine,
  RiFolderMusicLine,
  RiMenuLine,
  RiMusic2Line,
  RiPauseCircleFill,
  RiPlayCircleFill,
  RiSearchLine,
  RiSettings3Line,
  RiSkipForwardFill,
} from "@remixicon/react";
import clsx from "classnames";

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

const getPageTitle = (pathname: string) => {
  if (pathname === "/") return "Biu";
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

const isPathActive = (pathname: string, href: string) => {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

const MobileMiniPlayer = () => {
  const list = usePlayList(s => s.list);
  const playId = usePlayList(s => s.playId);
  const next = usePlayList(s => s.next);
  const togglePlay = usePlayList(s => s.togglePlay);
  const isPlaying = usePlayList(s => s.isPlaying);
  const openFullScreenPlayer = useModalStore(s => s.openFullScreenPlayer);

  const playItem = useMemo(() => list.find(item => item.id === playId), [list, playId]);
  const cover = formatUrlProtocol(playItem?.pageCover || playItem?.cover);

  if (!playItem) {
    return null;
  }

  return (
    <div className="border-divider/40 bg-background/95 border-t px-3 pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center gap-2">
        <button type="button" onClick={openFullScreenPlayer} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <div className="border-content2 bg-content2 flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-md border">
            {cover ? (
              <img src={cover} alt={playItem.pageTitle || playItem.title} className="h-full w-full object-cover" />
            ) : (
              <RiMusic2Line />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{playItem.pageTitle || playItem.title}</div>
            <div className="text-foreground-500 truncate text-xs">{playItem.source === "local" ? "本地音乐" : playItem.ownerName || "未知"}</div>
          </div>
        </button>
        <IconButton onPress={togglePlay} className="size-10 min-w-10">
          {isPlaying ? <RiPauseCircleFill size={28} /> : <RiPlayCircleFill size={28} />}
        </IconButton>
        <IconButton onPress={next} className="size-10 min-w-10">
          <RiSkipForwardFill size={20} />
        </IconButton>
        <OpenPlaylistDrawerButton />
      </div>
      <MusicPlayProgress className="mt-1 w-full" trackClassName="h-[3px]" />
    </div>
  );
};

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

  const canGoBack = (window.history?.state?.idx ?? 0) > 0;
  const title = getPageTitle(location.pathname);

  useEffect(() => {
    if (!user?.mid) {
      return;
    }

    void updateCreatedFavorites(user.mid);
    void updateCollectedFavorites(user.mid);
  }, [updateCollectedFavorites, updateCreatedFavorites, user?.mid]);

  const menuItems = useMemo(() => {
    const items = [
      ...DefaultMenuList,
      ...extraMenuItems,
    ].filter(item => !item.href || !hiddenMenuKeys.includes(item.href));

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
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-divider/40 border-b" style={{ paddingTop: "var(--safe-area-top)" }}>
        <div className="flex h-14 items-center gap-2 px-3">
          <div className="flex w-10 items-center justify-start">
            {canGoBack ? (
              <Button isIconOnly variant="light" radius="full" onPress={() => navigate(-1)}>
                <RiArrowLeftSLine size={20} />
              </Button>
            ) : (
              <Button isIconOnly variant="light" radius="full" onPress={onOpen}>
                <RiMenuLine size={20} />
              </Button>
            )}
          </div>
          <div className="min-w-0 flex-1 text-center">
            {location.pathname === "/" ? (
              <div className="text-primary inline-flex items-center gap-2 text-base font-semibold">
                <LogoIcon className="h-6 w-6" />
                <span>Biu</span>
              </div>
            ) : (
              <div className="truncate text-base font-medium">{title}</div>
            )}
          </div>
          <div className="flex w-10 items-center justify-end">
            <UserCard />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>

      <div className="flex-none">
        <MobileMiniPlayer />
        <nav
          className="border-divider/40 bg-background/95 grid grid-cols-5 border-t px-2 pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/80"
          style={{ paddingBottom: "calc(0.5rem + var(--safe-area-bottom))" }}
        >
          {bottomNavItems.map(item => {
            const active = isPathActive(location.pathname, item.href);
            const Icon = item.icon;

            return (
              <button
                key={item.href}
                type="button"
                onClick={() => navigate(item.href)}
                className={clsx(
                  "flex min-w-0 flex-col items-center justify-center gap-1 rounded-medium px-1 py-1 text-[11px] transition-colors",
                  active ? "text-primary" : "text-foreground-500",
                )}
              >
                <Icon size={20} />
                <span className="truncate">{item.title}</span>
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
    </div>
  );
};

export default MobileShell;
