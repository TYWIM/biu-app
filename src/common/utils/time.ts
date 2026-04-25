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
