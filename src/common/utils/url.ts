export const getUrlParams = (url: string) => {
  try {
    const queryIndex = url.indexOf("?");
    if (queryIndex === -1) return {};
    const urlParams = new URLSearchParams(url.slice(queryIndex + 1));
    return Object.fromEntries(urlParams.entries());
  } catch {
    return {};
  }
};

export const formatUrlProtocol = (url?: string) => {
  if (url && url.startsWith("http://")) {
    return url.replace("http://", "https://");
  }

  if (url && !url.startsWith("http")) {
    return `https:${url}`;
  }

  return url;
};

const getBiliVideoLink = (data: { type: "mv" | "audio"; bvid?: string; sid?: string | number; pageIndex?: number }) => {
  return `https://www.bilibili.com/${data?.type === "mv" ? `video/${data?.bvid}${(data.pageIndex ?? 0) > 1 ? `?p=${data.pageIndex}` : ""}` : `audio/au${data?.sid}`}`;
};

export const openBiliVideoLink = (data: {
  type: "mv" | "audio";
  bvid?: string;
  sid?: string | number;
  pageIndex?: number;
}) => {
  const url = getBiliVideoLink(data);

  if (window.electron?.openExternal) {
    window.electron.openExternal(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
};
