/**
 * Web Audio API 均衡器实现（PC 端）
 * 使用 BiquadFilterNode 模拟 5 段均衡器
 */

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

const EQ_FREQUENCIES = [60, 230, 910, 3600, 14000];
const MIN_LEVEL = -1500;
const MAX_LEVEL = 1500;

let audioContext: AudioContext | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;
let filterNodes: BiquadFilterNode[] = [];
let gainNode: GainNode | null = null;
let currentAudio: HTMLAudioElement | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
  return audioContext;
}

function createFilters(ctx: AudioContext): BiquadFilterNode[] {
  const filters: BiquadFilterNode[] = [];

  for (let i = 0; i < EQ_FREQUENCIES.length; i++) {
    const filter = ctx.createBiquadFilter();
    filter.type = i === 0 ? "lowshelf" : i === EQ_FREQUENCIES.length - 1 ? "highshelf" : "peaking";
    filter.frequency.value = EQ_FREQUENCIES[i];
    filter.Q.value = 1.0;
    filter.gain.value = 0;
    filters.push(filter);
  }

  // 连接滤波器链
  for (let i = 0; i < filters.length - 1; i++) {
    filters[i].connect(filters[i + 1]);
  }

  return filters;
}

export function attachEqualizer(audio: HTMLAudioElement): void {
  if (!audio || currentAudio === audio) return;

  // 如果已经连接了其他音频，先断开
  if (currentAudio && sourceNode) {
    try {
      sourceNode.disconnect();
    } catch {
      // ignore
    }
    sourceNode = null;
  }

  const ctx = getAudioContext();

  if (filterNodes.length === 0) {
    filterNodes = createFilters(ctx);
    gainNode = ctx.createGain();
    filterNodes[filterNodes.length - 1].connect(gainNode);
    gainNode.connect(ctx.destination);
  }

  try {
    sourceNode = ctx.createMediaElementSource(audio);
    sourceNode.connect(filterNodes[0]);
    currentAudio = audio;
  } catch (e) {
    // 可能已经连接过了
    console.warn("Equalizer attach failed:", e);
  }
}

export function detachEqualizer(): void {
  if (sourceNode) {
    try {
      sourceNode.disconnect();
    } catch {
      // ignore
    }
    sourceNode = null;
  }
  currentAudio = null;
}

export function getEqualizerInfo(): EqualizerInfo {
  const bands: EqualizerBand[] = EQ_FREQUENCIES.map((freq, i) => ({
    index: i,
    frequency: freq,
    level: filterNodes[i]?.gain.value ?? 0,
  }));

  return {
    available: true,
    minLevel: MIN_LEVEL,
    maxLevel: MAX_LEVEL,
    numBands: EQ_FREQUENCIES.length,
    bands,
  };
}

export function setEqualizerBands(levels: number[]): EqualizerInfo {
  for (let i = 0; i < Math.min(filterNodes.length, levels.length); i++) {
    if (filterNodes[i]) {
      const db = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, levels[i])) / 100;
      filterNodes[i].gain.value = db;
    }
  }
  return getEqualizerInfo();
}

export function setEqualizerPreset(preset: string): EqualizerInfo {
  const presets: Record<string, number[]> = {
    off: [0, 0, 0, 0, 0],
    pop: [300, 100, 0, 200, 400],
    rock: [500, 200, -100, 300, 500],
    classical: [0, 0, 0, 100, 200],
    jazz: [200, 100, 100, 200, 300],
    vocal: [-100, 200, 500, 200, -100],
    electronic: [600, 200, 0, 200, 600],
    bass: [800, 300, 0, 0, 0],
    treble: [0, 0, 0, 300, 800],
    dance: [700, 0, 0, 200, 300],
  };

  const levels = presets[preset.toLowerCase()];
  if (levels) {
    return setEqualizerBands(levels);
  }
  return getEqualizerInfo();
}

export function resetEqualizer(): void {
  setEqualizerBands([0, 0, 0, 0, 0]);
}
