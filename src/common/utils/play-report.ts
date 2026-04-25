import log from "@/common/utils/logger";
import dayjs from "dayjs";

import { postClickInterfaceClickWebH5 } from "@/service/click-interface-click-web-h5";
import { postClickInterfaceWebHeartbeat } from "@/service/click-interface-web-heartbeat";
import { useSettings } from "@/store/settings";
import { useUser } from "@/store/user";
import { usePlayProgress } from "@/store/play-progress";

const HEARTBEAT_INTERVAL_SECONDS = 30;
const HEARTBEAT_TIMER_INTERVAL_MS = HEARTBEAT_INTERVAL_SECONDS * 1000;

interface ReportablePlayItem {
  id?: string;
  type?: "mv" | "audio";
  aid?: number | string;
  bvid?: string;
  cid?: number | string;
  duration?: number;
  pageIndex?: number;
}

interface PlayReportSession {
  session: string;
  startTs: number;
  aid: number;
  bvid?: string;
  cid?: number;
  maxPlayedTime: number;
  lastReportAt: number;
  playId?: string;
  playItem: ReportablePlayItem;
}

let currentSession: PlayReportSession | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatFailCount = 0;
const MAX_HEARTBEAT_FAIL_COUNT = 5;

let _getCurrentDuration: (() => number | undefined) | null = null;

export function bindDurationGetter(getter: () => number | undefined) {
  _getCurrentDuration = getter;
}

const normalizeNumber = (value?: number | string): number | undefined => {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const isSameVideo = (item?: ReportablePlayItem) => {
  if (!currentSession || !item) return false;
  const aid = normalizeNumber(item.aid);
  const cid = normalizeNumber(item.cid);
  return (
    item.type === "mv" &&
    aid === currentSession.aid &&
    (cid === undefined || cid === currentSession.cid) &&
    (!item.bvid || item.bvid === currentSession.bvid)
  );
};

const generateSessionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
};

const checkReportingEnabled = () => {
  const { reportPlayHistory } = useSettings.getState();
  if (!reportPlayHistory) {
    currentSession = null;
    stopHeartbeatTimer();
    return false;
  }
  return true;
};

function startHeartbeatTimer() {
  stopHeartbeatTimer();
  heartbeatFailCount = 0;
  heartbeatTimer = setInterval(() => {
    if (!currentSession) {
      stopHeartbeatTimer();
      return;
    }
    const currentTime = usePlayProgress.getState().currentTime;
    const duration = _getCurrentDuration?.() ?? currentSession.playItem.duration;
    void reportHeartbeat(currentSession.playItem, currentTime, duration, 0);
  }, HEARTBEAT_TIMER_INTERVAL_MS);
}

function stopHeartbeatTimer() {
  if (heartbeatTimer !== null) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

export async function beginPlayReport(item?: ReportablePlayItem) {
  if (!checkReportingEnabled()) {
    return;
  }

  const aid = normalizeNumber(item?.aid);
  const cid = normalizeNumber(item?.cid);

  if (!item || item.type !== "mv" || aid === undefined) {
    currentSession = null;
    return;
  }

  const session = generateSessionId();
  const startTs = dayjs().unix();

  currentSession = {
    session,
    startTs,
    aid,
    bvid: item.bvid,
    cid,
    maxPlayedTime: 0,
    lastReportAt: 0,
    playId: item.id,
    playItem: item,
  };

  try {
    await postClickInterfaceClickWebH5(
      {
        mid: useUser.getState().user?.mid,
        lv: useUser.getState().user?.level_info?.current_level,
        aid,
        cid,
        type: 3,
        sub_type: 0,
        part: item.pageIndex,
        ftime: startTs,
        stime: startTs,
        session,
        referer_url: `https://www.bilibili.com/video/${item.bvid}`,
        outer: 0,
        platform: "web",
      },
      {
        w_aid: aid,
        w_part: item.pageIndex,
        w_type: 3,
        w_ftime: startTs,
        w_stime: startTs,
        web_location: 1315873,
      },
    );
  } catch (error) {
    log.warn("[play-report] start report failed", error);
  }

  startHeartbeatTimer();
}

export async function reportHeartbeat(
  item?: ReportablePlayItem,
  playedTime?: number,
  duration?: number,
  playType: number = 0,
) {
  if (!checkReportingEnabled()) {
    return;
  }

  if (!currentSession && item && item.type === "mv") {
    await beginPlayReport(item);
  }

  if (!currentSession || !isSameVideo(item)) return;

  const played = Math.max(0, Math.floor(playedTime ?? 0));
  currentSession.maxPlayedTime = Math.max(currentSession.maxPlayedTime, played);
  const normalizedDuration = Number.isFinite(duration) ? Math.floor(duration as number) : undefined;

  const now = dayjs().unix();
  const shouldForceSend = playType !== 0;
  if (!shouldForceSend && now - currentSession.lastReportAt < HEARTBEAT_INTERVAL_SECONDS) {
    return;
  }

  if (heartbeatFailCount >= MAX_HEARTBEAT_FAIL_COUNT) {
    const backoffSeconds = HEARTBEAT_INTERVAL_SECONDS + heartbeatFailCount * 15;
    if (now - currentSession.lastReportAt < backoffSeconds) {
      return;
    }
  }

  currentSession.lastReportAt = now;

  try {
    await postClickInterfaceWebHeartbeat(
      {
        aid: currentSession.aid,
        bvid: currentSession.bvid,
        cid: currentSession.cid,
        played_time: played,
        realtime: played,
        real_played_time: played,
        video_duration: normalizedDuration,
        last_play_progress_time: currentSession.maxPlayedTime,
        max_play_progress_time: currentSession.maxPlayedTime,
        start_ts: currentSession.startTs,
        dt: 2,
        outer: 0,
        play_type: playType,
        session: currentSession.session,
      },
      {
        w_start_ts: currentSession.startTs,
        w_mid: useUser.getState().user?.mid,
        w_aid: currentSession.aid,
        w_dt: 2,
        w_realtime: played,
        w_playedtime: played,
        w_real_played_time: played,
        w_video_duration: normalizedDuration,
        w_last_play_progress_time: currentSession.maxPlayedTime,
        web_location: 1315873,
      },
    );
    heartbeatFailCount = 0;
  } catch (error) {
    heartbeatFailCount++;
    log.warn("[play-report] heartbeat failed", error);
  }
}

export function endPlayReport() {
  stopHeartbeatTimer();
  currentSession = null;
  heartbeatFailCount = 0;
}
