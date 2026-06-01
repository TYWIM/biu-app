import dayjs from "dayjs";

export function formatDuration(seconds: number) {
  const totalSeconds = Math.floor(Math.abs(seconds));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (totalSeconds >= 3600) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const formatSecondsToDate = (s?: number) => (s ? dayjs.unix(s).format("YYYY-MM-DD") : "");

export const formatMillisecond = (s?: number) => (s ? dayjs(s).format("YYYY-MM-DD") : "");

export function formatTimeAgo(timestamp: number): string {
  const now = dayjs();
  const time = dayjs.unix(timestamp);
  const diffSeconds = now.diff(time, "second");

  if (diffSeconds < 60) {
    return "刚刚";
  }
  if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)}分钟前`;
  }
  if (diffSeconds < 86400) {
    return `${Math.floor(diffSeconds / 3600)}小时前`;
  }
  if (diffSeconds < 604800) {
    return `${Math.floor(diffSeconds / 86400)}天前`;
  }
  if (now.year() === time.year()) {
    return time.format("MM-DD");
  }
  return time.format("YYYY-MM-DD");
}
