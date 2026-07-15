import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { useShallow } from "zustand/react/shallow";

import { useAppUpdateStore } from "@/store/app-update";
import { useModalStore } from "@/store/modal";

import Typography from "../typography";

const RELEASES_URL = "https://github.com/TYWIM/biu-app/releases/latest";

const ReleaseNoteModal = () => {
  const { isReleaseNoteModalOpen, onReleaseNoteModalOpenChange } = useModalStore(
    useShallow(state => ({
      isReleaseNoteModalOpen: state.isReleaseNoteModalOpen,
      onReleaseNoteModalOpenChange: state.onReleaseNoteModalOpenChange,
    })),
  );
  const releaseNotes = useAppUpdateStore(state => state.releaseNotes);

  const openReleasePage = () => {
    window.open(RELEASES_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <Modal
      radius="md"
      shouldBlockScroll={false}
      scrollBehavior="inside"
      size="lg"
      isOpen={isReleaseNoteModalOpen}
      onOpenChange={onReleaseNoteModalOpenChange}
      isKeyboardDismissDisabled
      isDismissable={false}
      disableAnimation
    >
      <ModalContent>
        <ModalHeader>✨ 有新版本更新</ModalHeader>
        <ModalBody className="px-0">
          {releaseNotes?.trim() ? (
            <Typography content={releaseNotes} />
          ) : (
            <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">暂无更新日志</div>
          )}
        </ModalBody>
        <ModalFooter className="items-center justify-between">
          <Button color="primary" onPress={openReleasePage}>
            查看发布页
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ReleaseNoteModal;
