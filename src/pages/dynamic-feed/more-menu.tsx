import React from "react";

import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from "@heroui/react";
import { RiFileMusicLine, RiFileVideoLine, RiMore2Fill, RiPlayListAddLine } from "@remixicon/react";

interface MoreMenuProps {
  onAddToNext?: () => void;
  onDownloadAudio?: () => void;
  onDownloadVideo?: () => void;
  canDownload?: boolean;
}

const MoreMenu: React.FC<MoreMenuProps> = ({ onAddToNext, onDownloadAudio, onDownloadVideo, canDownload }) => {
  const resolvedCanDownload = canDownload ?? (typeof window !== "undefined" && Boolean(window.electron?.addMediaDownloadTask));
  const menuItems = [
    <DropdownItem key="add-next" startContent={<RiPlayListAddLine size={18} />} onPress={onAddToNext}>
      添加到下一首播放
    </DropdownItem>,
    ...(resolvedCanDownload
      ? [
          <DropdownItem key="download-audio" startContent={<RiFileMusicLine size={18} />} onPress={onDownloadAudio}>
            下载音频
          </DropdownItem>,
          <DropdownItem key="download-video" startContent={<RiFileVideoLine size={18} />} onPress={onDownloadVideo}>
            下载视频
          </DropdownItem>,
        ]
      : []),
  ];

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="light" isIconOnly size="sm" radius="md" className="text-default-500">
          <RiMore2Fill size={16} />
        </Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="More Actions">{menuItems}</DropdownMenu>
    </Dropdown>
  );
};

export default MoreMenu;
