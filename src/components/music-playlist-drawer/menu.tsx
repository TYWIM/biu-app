import { RiDeleteBinLine, RiExternalLinkLine, RiFileMusicLine, RiFileVideoLine, RiStarLine } from "@remixicon/react";

export const getMenus = ({
  isLogin,
  isLocal,
  canDownload,
}: {
  isLogin: boolean;
  isLocal: boolean;
  canDownload?: boolean;
}) =>
  [
    {
      key: "favorite",
      label: "收藏",
      icon: <RiStarLine size={18} />,
      hidden: isLocal || !isLogin,
    },
    {
      key: "download-audio",
      label: "下载音频",
      icon: <RiFileMusicLine size={18} />,
      hidden: isLocal || !canDownload,
    },
    {
      icon: <RiFileVideoLine size={18} />,
      key: "download-video",
      label: "下载视频",
      hidden: isLocal || !canDownload,
    },
    {
      key: "bililink",
      label: "在 B 站打开",
      icon: <RiExternalLinkLine size={18} />,
      hidden: isLocal,
    },
    {
      key: "del",
      color: "danger" as const,
      label: "从列表删除",
      icon: <RiDeleteBinLine size={18} />,
    },
  ].filter(item => !item.hidden);
