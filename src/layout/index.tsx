import React, { useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Outlet, useLocation } from "react-router";

import log from "@/common/utils/logger";

import ConfirmModal from "@/components/confirm-modal";
import Fallback from "@/components/error-fallback";
import FavoritesSelectModal from "@/components/favorites-select-modal";
import FullScreenPlayer from "@/components/full-screen-player";
import PlayListDrawer from "@/components/music-playlist-drawer";
import ReleaseNoteModal from "@/components/release-note-modal";
import VideoPagesDownloadSelectModal from "@/components/video-pages-download-select-modal";
import { useUser } from "@/store/user";

import MobileShell from "./mobile-shell";

const Layout = () => {
  const updateUser = useUser(state => state.updateUser);
  const location = useLocation();

  useEffect(() => {
    updateUser();
  }, []);

  return (
    <ErrorBoundary
      FallbackComponent={Fallback}
      resetKeys={[location.pathname]}
      onError={(error, info) => {
        log.error("[ErrorBoundary]", error, info);
      }}
    >
      <MobileShell>
        <Outlet />
      </MobileShell>
      <FavoritesSelectModal />
      <ConfirmModal />
      <VideoPagesDownloadSelectModal />
      <ReleaseNoteModal />
      <PlayListDrawer />
      <FullScreenPlayer />
    </ErrorBoundary>
  );
};

export default Layout;
