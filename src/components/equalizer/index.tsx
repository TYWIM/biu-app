import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { addToast } from "@heroui/react";
import { RiEqualizerLine } from "@remixicon/react";

import {
  EQUALIZER_PRESETS,
  getEqualizerInfo,
  resetEqualizer,
  setEqualizerBands,
  setEqualizerPreset,
  type EqualizerInfo,
} from "@/common/utils/equalizer-adapter";

import IconButton from "../icon-button";

interface EqualizerProps {
  audio?: HTMLAudioElement | null;
}

const Equalizer = memo(({ audio }: EqualizerProps) => {
  const [eqInfo, setEqInfo] = useState<EqualizerInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [currentPreset, setCurrentPreset] = useState("off");
  const [isDragging, setIsDragging] = useState(false);
  const dragBandRef = useRef<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // 加载均衡器信息
  useEffect(() => {
    if (!isOpen) return;

    const loadInfo = async () => {
      const info = await getEqualizerInfo();
      if (info) {
        setEqInfo(info);
      }
    };

    void loadInfo();
  }, [isOpen]);

  // 计算每个频段的增益百分比（用于 UI 显示）
  const getBandPercent = useCallback(
    (level: number) => {
      if (!eqInfo) return 50;
      const range = eqInfo.maxLevel - eqInfo.minLevel;
      if (range === 0) return 50;
      return ((level - eqInfo.minLevel) / range) * 100;
    },
    [eqInfo],
  );

  // 从百分比计算增益值
  const getLevelFromPercent = useCallback(
    (percent: number) => {
      if (!eqInfo) return 0;
      const range = eqInfo.maxLevel - eqInfo.minLevel;
      return Math.round(eqInfo.minLevel + (percent / 100) * range);
    },
    [eqInfo],
  );

  // 处理预设切换
  const handlePresetChange = useCallback(
    async (preset: string) => {
      const result = await setEqualizerPreset(preset);
      if (result) {
        setEqInfo(result);
        setCurrentPreset(preset);
        if (preset !== "off") {
          addToast({ title: `已应用 ${EQUALIZER_PRESETS.find(p => p.key === preset)?.label || preset} 音效`, color: "success" });
        }
      }
    },
    [],
  );

  // 处理频段拖动
  const handleMouseDown = useCallback(
    (bandIndex: number) => (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragBandRef.current = bandIndex;
    },
    [],
  );

  // 处理拖动移动
  useEffect(() => {
    if (!isDragging || !eqInfo) return;

    const handleMove = (clientY: number) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const bandIndex = dragBandRef.current;
      if (bandIndex < 0 || bandIndex >= eqInfo.numBands) return;

      // 计算相对位置（从底部开始，0-100%）
      const relativeY = clientY - rect.top;
      const percent = Math.max(0, Math.min(100, ((rect.height - relativeY) / rect.height) * 100));
      const newLevel = getLevelFromPercent(percent);

      const newBands = (eqInfo.bands ?? []).map((band, i) =>
        i === bandIndex ? { ...band, level: newLevel } : band,
      );

      setEqInfo(prev => (prev ? { ...prev, bands: newBands } : null));
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientY);
      }
    };

    const onEnd = () => {
      setIsDragging(false);
      dragBandRef.current = -1;

      // 拖动结束后应用设置
      if (eqInfo?.bands) {
        const levels = eqInfo.bands.map(b => b.level);
        void setEqualizerBands(levels);
        setCurrentPreset("custom");
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [isDragging, eqInfo, getLevelFromPercent]);

  // 格式化频率显示
  const formatFrequency = useCallback((freq: number) => {
    if (freq >= 1000) {
      return `${(freq / 1000).toFixed(1)}k`;
    }
    return `${freq}`;
  }, []);

  const bands = useMemo(() => eqInfo?.bands ?? [], [eqInfo]);

  if (!eqInfo?.available) {
    return null;
  }

  return (
    <div className="relative">
      <IconButton
        type="button"
        onPress={() => setIsOpen(prev => !prev)}
        className={`min-w-0 rounded-full text-xs font-semibold transition-colors ${
          currentPreset !== "off"
            ? "bg-primary/80 text-white hover:bg-primary"
            : "bg-foreground/20 text-foreground hover:bg-foreground/30"
        }`}
      >
        <RiEqualizerLine size={16} />
      </IconButton>

      {isOpen && (
        <div className="bg-background/95 border-divider absolute right-0 bottom-full z-50 mb-2 w-72 rounded-xl border p-4 shadow-lg backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold">均衡器</span>
            <button
              type="button"
              onClick={() => {
                void resetEqualizer();
                setCurrentPreset("off");
                void getEqualizerInfo().then(setEqInfo);
              }}
              className="text-foreground/60 hover:text-foreground text-xs transition-colors"
            >
              重置
            </button>
          </div>

          {/* 频段滑块 */}
          <div
            ref={containerRef}
            className="mb-4 flex h-32 items-end justify-around"
            style={{ touchAction: "none" }}
          >
            {bands.map((band, index) => (
              <div key={band.index} className="flex flex-col items-center gap-1">
                <div
                  className="bg-primary/20 relative w-6 cursor-pointer rounded-full"
                  style={{ height: "100px" }}
                  onMouseDown={handleMouseDown(index)}
                  onTouchStart={handleMouseDown(index)}
                >
                  <div
                    className="bg-primary absolute bottom-0 w-full rounded-full transition-all"
                    style={{
                      height: `${getBandPercent(band.level)}%`,
                      transition: isDragging ? "none" : "height 0.15s ease",
                    }}
                  />
                </div>
                <span className="text-foreground/60 text-[10px]">{formatFrequency(band.frequency)}</span>
              </div>
            ))}
          </div>

          {/* 预设选择 */}
          <div className="grid grid-cols-3 gap-1.5">
            {EQUALIZER_PRESETS.map(preset => (
              <button
                key={preset.key}
                type="button"
                onClick={() => void handlePresetChange(preset.key)}
                className={`rounded-md px-2 py-1 text-xs transition-colors ${
                  currentPreset === preset.key
                    ? "bg-primary text-white"
                    : "bg-foreground/10 text-foreground/80 hover:bg-foreground/20"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

Equalizer.displayName = "Equalizer";

export default Equalizer;
