import {
  RiExternalLinkLine,
  RiFileMusicLine,
  RiFileVideoLine,
  RiPlayCircleLine,
  RiPlayListAddLine,
  RiStarLine,
} from "@remixicon/react";

export const getContextMenus = ({ isLogin, canDownload }: { isLogin?: boolean; canDownload?: boolean }) => {
  const resolvedCanDownload = canDownload ?? (typeof window !== "undefined" && Boolean(window.electron?.addMediaDownloadTask));

  return [
    {
      icon: <RiStarLine size={18} />,
      key: "favorite",
      label: "收藏",
      hidden: !isLogin,
    },
    {
      icon: <RiPlayCircleLine size={18} />,
      key: "play-next",
      label: "下一首播放",
    },
    {
      icon: <RiPlayListAddLine size={18} />,
      key: "add-to-playlist",
      label: "添加到播放列表",
    },
    {
      icon: <RiFileMusicLine size={18} />,
      key: "download-audio",
      label: "下载音频",
      hidden: !resolvedCanDownload,
    },
    {
      icon: <RiFileVideoLine size={18} />,
      key: "download-video",
      label: "下载视频",
      hidden: !resolvedCanDownload,
    },
    {
      icon: <RiExternalLinkLine size={18} />,
      key: "bililink",
      label: "在 B 站打开",
    },
  ];
};
