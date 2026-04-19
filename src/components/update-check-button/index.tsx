import { addToast } from "@heroui/react";

import { useAppUpdateStore } from "@/store/app-update";
import { useModalStore } from "@/store/modal";

import AsyncButton from "../async-button";

const RELEASES_URL = "https://github.com/TYWIM/biu-app/releases/latest";

const UpdateCheckButton = () => {
  const isUpdateAvailable = useAppUpdateStore(s => s.isUpdateAvailable);
  const onOpenReleaseNoteModal = useModalStore(s => s.onOpenReleaseNoteModal);
  const electron = window.electron;

  const openReleasePage = () => {
    if (electron?.openExternal) {
      electron.openExternal(RELEASES_URL);
      return;
    }

    window.open(RELEASES_URL, "_blank", "noopener,noreferrer");
  };

  const checkUpdate = async () => {
    if (isUpdateAvailable) {
      onOpenReleaseNoteModal();

      return;
    }

    if (!electron?.checkAppUpdate) {
      openReleasePage();
      addToast({
        title: "已打开项目发布页",
        color: "default",
      });
      return;
    }

    const res = await electron.checkAppUpdate();

    if (res?.error) {
      addToast({
        title: "检查更新失败",
        description: res.error,
        color: "danger",
      });
    } else if (res?.isUpdateAvailable) {
      onOpenReleaseNoteModal();
    } else {
      addToast({
        title: "当前版本为最新版本",
        color: "success",
      });
    }
  };

  return <AsyncButton onPress={checkUpdate}>{isUpdateAvailable ? "查看更新内容" : "检查更新"}</AsyncButton>;
};

export default UpdateCheckButton;
