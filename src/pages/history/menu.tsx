import {
  RiDeleteBinLine,
  RiExternalLinkLine,
  RiFileMusicLine,
  RiFileVideoLine,
  RiPlayCircleLine,
  RiPlayListAddLine,
} from "@remixicon/react";

export const getContextMenus = ({ business, canDownload }: { business: string; canDownload?: boolean }) => {
  const canPlay = business === "archive";
  const resolvedCanDownload = canDownload ?? (typeof window !== "undefined" && Boolean(window.electron?.addMediaDownloadTask));

  return [
    {
      icon: <RiPlayCircleLine size={18} />,
      key: "play-next",
      label: "下一首播放",
      hidden: !canPlay,
    },
    {
      icon: <RiPlayListAddLine size={18} />,
      key: "add-to-playlist",
      label: "添加到播放列表",
      hidden: !canPlay,
    },
    {
      icon: <RiFileMusicLine size={18} />,
      key: "download-audio",
      label: "下载音频",
      hidden: !canPlay || !resolvedCanDownload,
    },
    {
      icon: <RiFileVideoLine size={18} />,
      key: "download-video",
      label: "下载视频",
      hidden: !canPlay || !resolvedCanDownload,
    },
    {
      key: "bililink",
      label: "在 B 站打开",
      icon: <RiExternalLinkLine size={18} />,
    },
    {
      icon: <RiDeleteBinLine size={18} />,
      key: "delete",
      label: "删除",
      className: "text-danger",
      color: "danger" as const,
    },
  ];
};
