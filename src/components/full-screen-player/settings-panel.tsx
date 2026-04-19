import { useEffect, useState } from "react";

import { Switch } from "@heroui/react";
import { useShallow } from "zustand/shallow";

import { isHex } from "@/common/utils/color";
import { shouldUseNativePlayer } from "@/common/utils/native-player";
import ColorPicker from "@/components/color-picker";
import { useTheme } from "@/components/theme/use-theme";
import { useFullScreenPlayerSettings } from "@/store/full-screen-player-settings";
import { usePlayList } from "@/store/play-list";
import { useSettings } from "@/store/settings";

const FullScreenPlayerSettingsPanel = ({ isUiVisible = true }: { isUiVisible?: boolean }) => {
  const { theme } = useTheme();
  const playItem = usePlayList(state => state.list.find(item => item.id === state.playId));
  const isLocal = playItem?.source === "local";
  const canFollowSystemVolume = shouldUseNativePlayer();
  const {
    showLyrics,
    showCover,
    showBlurredBackground,
    backgroundColor,
    lyricsColor,
    update,
  } = useFullScreenPlayerSettings(
    useShallow(s => ({
      showLyrics: s.showLyrics,
      showCover: s.showCover,
      showBlurredBackground: s.showBlurredBackground,
      backgroundColor: s.backgroundColor,
      lyricsColor: s.lyricsColor,
      update: s.update,
    })),
  );
  const { followSystemVolume, update: updateSettings } = useSettings(
    useShallow(state => ({
      followSystemVolume: state.followSystemVolume,
      update: state.update,
    })),
  );

  const [lyricsPickerOpen, setLyricsPickerOpen] = useState(false);
  const [backgroundPickerOpen, setBackgroundPickerOpen] = useState(false);
  const resolvedLyricsColor = isHex(lyricsColor) ? lyricsColor : theme === "dark" ? "#ffffff" : "#0f172a";
  const resolvedBackgroundColor = isHex(backgroundColor) ? backgroundColor : theme === "dark" ? "#0b1220" : "#f8fafc";

  useEffect(() => {
    if (!isUiVisible) {
      setLyricsPickerOpen(false);
      setBackgroundPickerOpen(false);
    }
  }, [isUiVisible]);

  return (
    <div className="min-w-[320px] space-y-4">
      <div className="rounded-2xl border border-default-200/60 bg-content2/60 px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-medium">跟随系统音量</div>
            <div className="mt-1 text-xs text-default-500">
              {canFollowSystemVolume
                ? followSystemVolume
                  ? "当前使用系统音量键控制播放音量"
                  : "当前使用应用内音量滑杆控制播放音量"
                : "当前环境仅支持应用内音量调节"}
            </div>
          </div>
          <Switch
            disableAnimation
            isSelected={followSystemVolume}
            isDisabled={!canFollowSystemVolume}
            onValueChange={value => updateSettings({ followSystemVolume: value })}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-default-200/60 bg-content2/60 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-medium">显示歌词</div>
            <div className="mt-1 text-xs text-default-500">关闭后将优先显示封面和背景氛围</div>
          </div>
          <Switch disableAnimation isSelected={showLyrics} onValueChange={value => update({ showLyrics: value })} />
        </div>
      </div>

      {showLyrics && (
        <div className="rounded-2xl border border-default-200/60 bg-content2/60 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-medium">歌词字体颜色</div>
              <div className="mt-1 text-xs text-default-500">调亮或调暗歌词文本以适应当前背景</div>
            </div>
            <ColorPicker
              value={resolvedLyricsColor}
              onChange={hex => update({ lyricsColor: hex })}
              isOpen={lyricsPickerOpen && isUiVisible}
              onOpenChange={setLyricsPickerOpen}
            >
              <div className="border-default h-8 w-12 rounded-full border" style={{ backgroundColor: resolvedLyricsColor }} />
            </ColorPicker>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-default-200/60 bg-content2/60 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-medium">显示封面</div>
            <div className="mt-1 text-xs text-default-500">保留专辑/视频封面作为歌词页的视觉锚点</div>
          </div>
          <Switch disableAnimation isSelected={showCover} onValueChange={value => update({ showCover: value })} isDisabled={isLocal} />
        </div>
      </div>

      <div className="rounded-2xl border border-default-200/60 bg-content2/60 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-medium">显示虚化背景</div>
            <div className="mt-1 text-xs text-default-500">关闭后会使用更稳定、更明确的浅色或深色背景</div>
          </div>
          <Switch disableAnimation isSelected={showBlurredBackground} onValueChange={value => update({ showBlurredBackground: value })} />
        </div>
      </div>

      {!showBlurredBackground && (
        <div className="rounded-2xl border border-default-200/60 bg-content2/60 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-medium">背景颜色</div>
              <div className="mt-1 text-xs text-default-500">为当前主题指定更纯净的播放器底色</div>
            </div>
            <ColorPicker
              value={resolvedBackgroundColor}
              onChange={hex => update({ backgroundColor: hex })}
              isOpen={backgroundPickerOpen && isUiVisible}
              onOpenChange={setBackgroundPickerOpen}
            >
              <div className="border-default h-8 w-12 rounded-full border" style={{ backgroundColor: resolvedBackgroundColor }} />
            </ColorPicker>
          </div>
        </div>
      )}
    </div>
  );
};

export default FullScreenPlayerSettingsPanel;
