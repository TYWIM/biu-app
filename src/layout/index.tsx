import React, { Suspense, useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Outlet, useLocation } from "react-router";

import { useShallow } from "zustand/shallow";

import log from "@/common/utils/logger";
import Fallback from "@/components/error-fallback";
import { useModalStore } from "@/store/modal";
import { useUser } from "@/store/user";

import MobileShell from "./mobile-shell";

const ConfirmModal = React.lazy(() => import("@/components/confirm-modal"));
const FavoritesSelectModal = React.lazy(() => import("@/components/favorites-select-modal"));
const FullScreenPlayer = React.lazy(() => import("@/components/full-screen-player"));
const PlayListDrawer = React.lazy(() => import("@/components/music-playlist-drawer"));
const ReleaseNoteModal = React.lazy(() => import("@/components/release-note-modal"));
const VideoPagesDownloadSelectModal = React.lazy(() => import("@/components/video-pages-download-select-modal"));

const Layout = () => {
  const updateUser = useUser(state => state.updateUser);
  const location = useLocation();
  const openModals = useModalStore(
    useShallow(state => ({
      confirm: state.isConfirmModalOpen,
      favorite: state.isFavSelectModalOpen,
      fullScreenPlayer: state.isFullScreenPlayerOpen,
      playList: state.isPlayListDrawerOpen,
      releaseNote: state.isReleaseNoteModalOpen,
      videoDownload: state.isVideoPageDownloadModalOpen,
    })),
  );

  useEffect(() => {
    updateUser();
  }, [updateUser]);

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
      <Suspense fallback={null}>
        {openModals.favorite ? <FavoritesSelectModal /> : null}
        {openModals.confirm ? <ConfirmModal /> : null}
        {openModals.videoDownload ? <VideoPagesDownloadSelectModal /> : null}
        {openModals.releaseNote ? <ReleaseNoteModal /> : null}
        {openModals.playList ? <PlayListDrawer /> : null}
        {openModals.fullScreenPlayer ? <FullScreenPlayer /> : null}
      </Suspense>
    </ErrorBoundary>
  );
};

export default Layout;
