import {
  RiDeleteBinLine,
  RiExternalLinkLine,
  RiFileMusicLine,
  RiFileVideoLine,
  RiPlayCircleLine,
  RiPlayListAddLine,
} from "@remixicon/react";

export const getContextMenus = ({ is_pgc, canDownload }: { is_pgc: boolean; canDownload?: boolean }) => {
  const cannotPlay = is_pgc;
  const resolvedCanDownload = canDownload ?? (typeof window !== "undefined" && Boolean(window.electron?.addMediaDownloadTask));

  return [
    {
      icon: <RiPlayCircleLine size={18} />,
      key: "play-next",
      label: "下一首播放",
      hidden: cannotPlay,
    },
    {
      icon: <RiPlayListAddLine size={18} />,
      key: "add-to-playlist",
      label: "添加到播放列表",
      hidden: cannotPlay,
    },
    {
      icon: <RiFileMusicLine size={18} />,
      key: "download-audio",
      label: "下载音频",
      hidden: cannotPlay || !resolvedCanDownload,
    },
    {
      icon: <RiFileVideoLine size={18} />,
      key: "download-video",
      label: "下载视频",
      hidden: cannotPlay || !resolvedCanDownload,
    },
    {
      key: "bililink",
      label: "在 B 站打开",
      icon: <RiExternalLinkLine size={18} />,
    },
    {
      icon: <RiDeleteBinLine size={18} />,
      key: "delete",
      label: "移除",
      className: "text-danger",
      color: "danger" as const,
    },
  ];
};
