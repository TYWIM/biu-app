import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

import { isCapacitorNative } from "./runtime-platform";

type MediaEventHandler<K extends keyof HTMLMediaElement> = HTMLMediaElement[K];

export interface PlaybackAudio {
  src: string;
  currentTime: number;
  duration: number;
  paused: boolean;
  muted: boolean;
  volume: number;
  playbackRate: number;
  loop: boolean;
  preload: string;
  controls: boolean;
  crossOrigin: string | null;
  onloadedmetadata: MediaEventHandler<"onloadedmetadata">;
  oncanplay: MediaEventHandler<"oncanplay">;
  ondurationchange: MediaEventHandler<"ondurationchange">;
  ontimeupdate: MediaEventHandler<"ontimeupdate">;
  onseeked: MediaEventHandler<"onseeked">;
  onratechange: MediaEventHandler<"onratechange">;
  onplaying: MediaEventHandler<"onplaying">;
  onplay: MediaEventHandler<"onplay">;
  onpause: MediaEventHandler<"onpause">;
  onended: MediaEventHandler<"onended">;
  onerror: MediaEventHandler<"onerror">;
  onemptied: MediaEventHandler<"onemptied">;
  addEventListener: HTMLAudioElement["addEventListener"];
  removeEventListener: HTMLAudioElement["removeEventListener"];
  play: () => Promise<void>;
  pause: () => void;
  load: () => void;
}

interface NativePlayerState {
  reason?: string;
  command?: string;
  src?: string;
  currentTime?: number;
  duration?: number;
  paused?: boolean;
  playing?: boolean;
  buffering?: boolean;
  muted?: boolean;
  volume?: number;
  playbackRate?: number;
  loop?: boolean;
  ready?: boolean;
  ended?: boolean;
  error?: string;
}

export interface EqualizerBand {
  index: number;
  frequency: number;
  level: number;
}

export interface EqualizerInfo {
  available: boolean;
  minLevel: number;
  maxLevel: number;
  numBands: number;
  bands?: EqualizerBand[];
}

interface NativePlayerPlugin {
  configure(options: { volume: number; muted: boolean; playbackRate: number; loop: boolean }): Promise<NativePlayerState>;
  setSource(options: { url: string }): Promise<NativePlayerState>;
  updateMetadata(options: { title?: string; artist?: string; cover?: string }): Promise<void>;
  play(): Promise<NativePlayerState>;
  pause(): Promise<NativePlayerState>;
  seekTo(options: { position: number }): Promise<NativePlayerState>;
  clear(): Promise<NativePlayerState>;
  getState(): Promise<NativePlayerState>;
  getEqualizerInfo(): Promise<EqualizerInfo>;
  setEqualizerBands(options: { levels: number[] }): Promise<EqualizerInfo>;
  setEqualizerPreset(options: { preset: string }): Promise<EqualizerInfo>;
  addListener(
    eventName: "playerStateChange",
    listenerFunc: (state: NativePlayerState) => void,
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
}

const NativePlayer = registerPlugin<NativePlayerPlugin>("BiuPlayer");

export const shouldUseNativePlayer = () => isCapacitorNative() && Capacitor.getPlatform() === "android";

const noop = () => {};

const callMediaHandler = (handler: ((this: GlobalEventHandlers, ev: Event) => any) | null | undefined, type: string) => {
  handler?.call(window as unknown as GlobalEventHandlers, new Event(type));
};

const callMediaErrorHandler = (handler: HTMLMediaElement["onerror"]) => {
  if (typeof handler === "function") {
    handler.call(window as unknown as GlobalEventHandlers, new Event("error"));
  }
};

export const updateNativePlayerMetadata = async (metadata: { title?: string; artist?: string; cover?: string }) => {
  if (!shouldUseNativePlayer()) {
    return;
  }

  await NativePlayer.updateMetadata(metadata);
};

export const getEqualizerInfo = async (): Promise<EqualizerInfo | null> => {
  if (!shouldUseNativePlayer()) {
    return null;
  }

  try {
    return await NativePlayer.getEqualizerInfo();
  } catch {
    return null;
  }
};

export const setEqualizerBands = async (levels: number[]): Promise<EqualizerInfo | null> => {
  if (!shouldUseNativePlayer()) {
    return null;
  }

  try {
    return await NativePlayer.setEqualizerBands({ levels });
  } catch {
    return null;
  }
};

export const setEqualizerPreset = async (preset: string): Promise<EqualizerInfo | null> => {
  if (!shouldUseNativePlayer()) {
    return null;
  }

  try {
    return await NativePlayer.setEqualizerPreset({ preset });
  } catch {
    return null;
  }
};

let nativeAudioAdapterInstance: NativeAudioAdapter | null = null;

export const setNativePlayerRemoteCommandHandler = (handler: (command: "next" | "prev") => void) => {
  if (nativeAudioAdapterInstance) {
    nativeAudioAdapterInstance.onRemoteCommand = handler;
  }
};

class NativeAudioAdapter implements PlaybackAudio {
  src = "";

  currentTime = 0;

  duration = Number.NaN;

  paused = true;

  muted = false;

  volume = 0.5;

  playbackRate = 1;

  loop = false;

  preload = "metadata";

  controls = false;

  crossOrigin = null;

  onloadedmetadata: MediaEventHandler<"onloadedmetadata"> = null;

  oncanplay: MediaEventHandler<"oncanplay"> = null;

  ondurationchange: MediaEventHandler<"ondurationchange"> = null;

  ontimeupdate: MediaEventHandler<"ontimeupdate"> = null;

  onseeked: MediaEventHandler<"onseeked"> = null;

  onratechange: MediaEventHandler<"onratechange"> = null;

  onplaying: MediaEventHandler<"onplaying"> = null;

  onplay: MediaEventHandler<"onplay"> = null;

  onpause: MediaEventHandler<"onpause"> = null;

  onended: MediaEventHandler<"onended"> = null;

  onerror: MediaEventHandler<"onerror"> = null;

  onemptied: MediaEventHandler<"onemptied"> = null;

  onRemoteCommand: ((command: "next" | "prev") => void) | null = null;

  private readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  private ready = false;

  private playing = false;

  private buffering = false;

  private listenerHandle?: PluginListenerHandle;

  private commandQueue: Promise<unknown> = Promise.resolve();

  private pendingCount = 0;

  private static readonly COMMAND_TIMEOUT_MS = 5000;

  private static readonly MAX_PENDING_COMMANDS = 10;

  constructor() {
    void this.init();
  }

  private enqueueCommand = <T>(task: () => Promise<T>) => {
    if (this.pendingCount >= NativeAudioAdapter.MAX_PENDING_COMMANDS) {
      return Promise.reject(new Error("NativePlayer command queue overflow"));
    }

    this.pendingCount++;
    const result = this.commandQueue.then(() => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("NativePlayer command timeout")), NativeAudioAdapter.COMMAND_TIMEOUT_MS);
      });
      const taskResult = task();
      taskResult.then(() => { if (timeoutId) clearTimeout(timeoutId); }, () => { if (timeoutId) clearTimeout(timeoutId); });
      return Promise.race([taskResult, timeout]);
    });
    this.commandQueue = result.then(
      () => { this.pendingCount--; },
      () => { this.pendingCount--; },
    );
    return result;
  };

  private emit(type: string) {
    const listeners = this.listeners.get(type);
    if (!listeners?.size) {
      return;
    }

    const event = new Event(type);
    for (const listener of listeners) {
      if (typeof listener === "function") {
        listener.call(window, event);
      } else {
        listener.handleEvent(event);
      }
    }
  }

  private async init() {
    this.listenerHandle = await NativePlayer.addListener("playerStateChange", state => {
      this.applyState(state);
    });

    try {
      const state = await NativePlayer.getState();
      this.applyState(state);
    } catch {
      noop();
    }
  }

  private applyState(next: NativePlayerState) {
    const prev = {
      src: this.src,
      currentTime: this.currentTime,
      duration: this.duration,
      paused: this.paused,
      muted: this.muted,
      volume: this.volume,
      playbackRate: this.playbackRate,
      loop: this.loop,
      ready: this.ready,
      ended: false,
      playing: this.playing,
      buffering: this.buffering,
    };

    if (typeof next.src === "string") {
      this.src = next.src;
    }
    if (typeof next.currentTime === "number") {
      this.currentTime = next.currentTime;
    }
    if (typeof next.duration === "number") {
      this.duration = next.duration > 0 ? next.duration : Number.NaN;
    }
    if (typeof next.paused === "boolean") {
      this.paused = next.paused;
    }
    if (typeof next.muted === "boolean") {
      this.muted = next.muted;
    }
    if (typeof next.volume === "number") {
      this.volume = next.volume;
    }
    if (typeof next.playbackRate === "number") {
      this.playbackRate = next.playbackRate;
    }
    if (typeof next.loop === "boolean") {
      this.loop = next.loop;
    }
    if (typeof next.ready === "boolean") {
      this.ready = next.ready;
    }
    if (typeof next.playing === "boolean") {
      this.playing = next.playing;
    }
    if (typeof next.buffering === "boolean") {
      this.buffering = next.buffering;
    }

    const ended = Boolean(next.ended);
    const reason = next.reason;

    if (!prev.ready && this.ready) {
      callMediaHandler(this.onloadedmetadata as ((this: GlobalEventHandlers, ev: Event) => any) | null, "loadedmetadata");
      this.emit("loadedmetadata");
      callMediaHandler(this.oncanplay as ((this: GlobalEventHandlers, ev: Event) => any) | null, "canplay");
      this.emit("canplay");
    }

    if (prev.duration !== this.duration) {
      callMediaHandler(this.ondurationchange as ((this: GlobalEventHandlers, ev: Event) => any) | null, "durationchange");
      this.emit("durationchange");
    }

    if (prev.playbackRate !== this.playbackRate) {
      callMediaHandler(this.onratechange as ((this: GlobalEventHandlers, ev: Event) => any) | null, "ratechange");
      this.emit("ratechange");
    }

    if (prev.currentTime !== this.currentTime) {
      callMediaHandler(this.ontimeupdate as ((this: GlobalEventHandlers, ev: Event) => any) | null, "timeupdate");
      this.emit("timeupdate");
      if (reason === "seek") {
        callMediaHandler(this.onseeked as ((this: GlobalEventHandlers, ev: Event) => any) | null, "seeked");
        this.emit("seeked");
      }
    }

    if (prev.paused && !this.paused) {
      callMediaHandler(this.onplay as ((this: GlobalEventHandlers, ev: Event) => any) | null, "play");
      this.emit("play");
    }

    if (!prev.playing && this.playing) {
      callMediaHandler(this.onplaying as ((this: GlobalEventHandlers, ev: Event) => any) | null, "playing");
      this.emit("playing");
    }

    if (!prev.paused && this.paused) {
      callMediaHandler(this.onpause as ((this: GlobalEventHandlers, ev: Event) => any) | null, "pause");
      this.emit("pause");
    }

    if (!prev.ended && ended) {
      callMediaHandler(this.onended as ((this: GlobalEventHandlers, ev: Event) => any) | null, "ended");
      this.emit("ended");
    }

    if (reason === "cleared") {
      callMediaHandler(this.onemptied as ((this: GlobalEventHandlers, ev: Event) => any) | null, "emptied");
      this.emit("emptied");
    }

    if (reason === "command" && next.command) {
      if (next.command === "next" || next.command === "prev") {
        this.onRemoteCommand?.(next.command);
      }
    }

    if (next.error) {
      callMediaErrorHandler(this.onerror);
      this.emit("error");
    }
  }

  private syncConfig() {
    return this.enqueueCommand(async () => {
      const state = await NativePlayer.configure({
        volume: this.volume,
        muted: this.muted,
        playbackRate: this.playbackRate,
        loop: this.loop,
      });
      this.applyState(state);
      return state;
    });
  }

  async play() {
    await this.enqueueCommand(async () => {
      const configState = await NativePlayer.configure({
        volume: this.volume,
        muted: this.muted,
        playbackRate: this.playbackRate,
        loop: this.loop,
      });
      this.applyState(configState);

      const state = await NativePlayer.play();
      this.applyState(state);
      return state;
    });
  }

  pause() {
    void this.enqueueCommand(async () => {
      const state = await NativePlayer.pause();
      this.applyState(state);
      return state;
    });
  }

  load() {
    noop();
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, _options?: boolean | AddEventListenerOptions) {
    if (!listener) {
      return;
    }

    const listeners = this.listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, _options?: boolean | EventListenerOptions) {
    if (!listener) {
      return;
    }

    const listeners = this.listeners.get(type);
    if (!listeners) {
      return;
    }

    listeners.delete(listener);
    if (listeners.size === 0) {
      this.listeners.delete(type);
    }
  }

  setSrc(value: string) {
    this.src = value;
    this.ready = false;
    this.duration = Number.NaN;
    this.currentTime = 0;
    this.playing = false;
    this.buffering = false;
    this.paused = true;

    if (!value) {
      void this.enqueueCommand(async () => {
        const state = await NativePlayer.clear();
        this.applyState(state);
        return state;
      });
      return;
    }

    void this.enqueueCommand(async () => {
      const state = await NativePlayer.setSource({ url: value });
      this.applyState(state);
      return state;
    });
  }

  setCurrentTime(value: number) {
    this.currentTime = value;
    void this.enqueueCommand(async () => {
      const state = await NativePlayer.seekTo({ position: value });
      this.applyState(state);
      return state;
    });
  }

  setMuted(value: boolean) {
    this.muted = value;
    void this.syncConfig();
  }

  setVolumeValue(value: number) {
    this.volume = value;
    void this.syncConfig();
  }

  setPlaybackRateValue(value: number) {
    this.playbackRate = value;
    void this.syncConfig();
  }

  setLoopValue(value: boolean) {
    this.loop = value;
    void this.syncConfig();
  }
}

export const createPlaybackAudio = (): PlaybackAudio => {
  if (!shouldUseNativePlayer()) {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.controls = false;
    if (typeof window !== "undefined" && (window as Window & { electron?: unknown }).electron) {
      audio.crossOrigin = "anonymous";
    }
    // 附加 Web Audio 均衡器
    import("./web-equalizer").then(({ attachEqualizer }) => {
      attachEqualizer(audio);
    }).catch(() => {
      // 均衡器加载失败不影响播放
    });
    return audio;
  }

  const nativeAudio = new NativeAudioAdapter();
  nativeAudioAdapterInstance = nativeAudio;

  return new Proxy(nativeAudio, {
    get(target, prop, receiver) {
      if (prop === "src") return target.src;
      if (prop === "currentTime") return target.currentTime;
      if (prop === "muted") return target.muted;
      if (prop === "volume") return target.volume;
      if (prop === "playbackRate") return target.playbackRate;
      if (prop === "loop") return target.loop;
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      if (prop === "src") {
        target.setSrc(String(value ?? ""));
        return true;
      }
      if (prop === "currentTime") {
        target.setCurrentTime(Number(value ?? 0));
        return true;
      }
      if (prop === "muted") {
        target.setMuted(Boolean(value));
        return true;
      }
      if (prop === "volume") {
        target.setVolumeValue(Number(value ?? 0));
        return true;
      }
      if (prop === "playbackRate") {
        target.setPlaybackRateValue(Number(value ?? 1));
        return true;
      }
      if (prop === "loop") {
        target.setLoopValue(Boolean(value));
        return true;
      }
      return Reflect.set(target, prop, value, receiver);
    },
  }) as PlaybackAudio;
};
