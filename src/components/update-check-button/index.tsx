import { addToast } from "@heroui/react";

import { useAppUpdateStore } from "@/store/app-update";
import { useModalStore } from "@/store/modal";

import AsyncButton from "../async-button";

const RELEASES_URL = "https://github.com/TYWIM/biu-app/releases/latest";

const UpdateCheckButton = () => {
  const isUpdateAvailable = useAppUpdateStore(s => s.isUpdateAvailable);
  const onOpenReleaseNoteModal = useModalStore(s => s.onOpenReleaseNoteModal);

  const openReleasePage = () => {
    window.open(RELEASES_URL, "_blank", "noopener,noreferrer");
  };

  const checkUpdate = async () => {
    if (isUpdateAvailable) {
      onOpenReleaseNoteModal();
      return;
    }

    openReleasePage();
    addToast({
      title: "已打开项目发布页",
      color: "default",
    });
  };

  return <AsyncButton onPress={checkUpdate}>{isUpdateAvailable ? "查看更新内容" : "检查更新"}</AsyncButton>;
};

export default UpdateCheckButton;
