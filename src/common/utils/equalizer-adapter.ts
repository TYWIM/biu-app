/**
 * 均衡器统一适配层
 * Android 端使用原生 Equalizer，PC 端使用 Web Audio API
 */

import { Capacitor } from "@capacitor/core";

import { isCapacitorNative } from "./runtime-platform";
import type { EqualizerInfo, EqualizerBand } from "./native-player";
import {
  getEqualizerInfo as getNativeEqualizerInfo,
  setEqualizerBands as setNativeEqualizerBands,
  setEqualizerPreset as setNativeEqualizerPreset,
} from "./native-player";
import {
  attachEqualizer as attachWebEqualizer,
  detachEqualizer as detachWebEqualizer,
  getEqualizerInfo as getWebEqualizerInfo,
  setEqualizerBands as setWebEqualizerBands,
  setEqualizerPreset as setWebEqualizerPreset,
} from "./web-equalizer";

export type { EqualizerInfo, EqualizerBand };

const isNative = () => isCapacitorNative() && Capacitor.getPlatform() === "android";

/**
 * 将均衡器附加到音频元素（仅在 PC 端需要）
 */
export function attachEqualizer(audio: HTMLAudioElement): void {
  if (!isNative()) {
    attachWebEqualizer(audio);
  }
}

/**
 * 分离均衡器（仅在 PC 端需要）
 */
export function detachEqualizer(): void {
  if (!isNative()) {
    detachWebEqualizer();
  }
}

/**
 * 获取均衡器信息
 */
export async function getEqualizerInfo(): Promise<EqualizerInfo | null> {
  if (isNative()) {
    return getNativeEqualizerInfo();
  }
  return getWebEqualizerInfo();
}

/**
 * 设置均衡器各频段增益
 * @param levels 各频段增益值（单位：mB，即 1/100 dB）
 */
export async function setEqualizerBands(levels: number[]): Promise<EqualizerInfo | null> {
  if (isNative()) {
    return setNativeEqualizerBands(levels);
  }
  return setWebEqualizerBands(levels);
}

/**
 * 应用预设音效
 * @param preset 预设名称：off, pop, rock, classical, jazz, vocal, electronic, bass, treble, dance
 */
export async function setEqualizerPreset(preset: string): Promise<EqualizerInfo | null> {
  if (isNative()) {
    return setNativeEqualizerPreset(preset);
  }
  return setWebEqualizerPreset(preset);
}

/**
 * 重置均衡器为默认状态
 */
export async function resetEqualizer(): Promise<EqualizerInfo | null> {
  return setEqualizerBands([0, 0, 0, 0, 0]);
}

/**
 * 预设音效列表
 */
export const EQUALIZER_PRESETS = [
  { key: "off", label: "关闭" },
  { key: "pop", label: "流行" },
  { key: "rock", label: "摇滚" },
  { key: "classical", label: "古典" },
  { key: "jazz", label: "爵士" },
  { key: "vocal", label: "人声" },
  { key: "electronic", label: "电子" },
  { key: "bass", label: "低音增强" },
  { key: "treble", label: "高音增强" },
  { key: "dance", label: "舞曲" },
] as const;

export type EqualizerPresetKey = (typeof EQUALIZER_PRESETS)[number]["key"];
