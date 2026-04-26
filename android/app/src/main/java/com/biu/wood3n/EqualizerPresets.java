package com.biu.wood3n;

import java.util.HashMap;
import java.util.Map;

public class EqualizerPresets {

    // 预设音效：每个预设是一个 short 数组，表示各频段的增益值（单位：mB，即 1/100 dB）
    // 标准 5 段均衡器频段：60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz
    // 增益范围通常为 -1500 ~ +1500 (即 -15dB ~ +15dB)

    private static final Map<String, short[]> PRESETS = new HashMap<>();

    static {
        // 默认/关闭：所有频段 0
        PRESETS.put("off", new short[]{0, 0, 0, 0, 0});

        // 流行：增强低频和高频，人声清晰
        PRESETS.put("pop", new short[]{300, 100, 0, 200, 400});

        // 摇滚：增强低频和高频，中频略减
        PRESETS.put("rock", new short[]{500, 200, -100, 300, 500});

        // 古典：平衡，略微增强高频
        PRESETS.put("classical", new short[]{0, 0, 0, 100, 200});

        // 爵士：增强中低频和中高频
        PRESETS.put("jazz", new short[]{200, 100, 100, 200, 300});

        // 人声：增强中频，突出人声
        PRESETS.put("vocal", new short[]{-100, 200, 500, 200, -100});

        // 电子：增强低频和高频
        PRESETS.put("electronic", new short[]{600, 200, 0, 200, 600});

        // 低音增强：大幅增强低频
        PRESETS.put("bass", new short[]{800, 300, 0, 0, 0});

        // 高音增强：大幅增强高频
        PRESETS.put("treble", new short[]{0, 0, 0, 300, 800});

        // 舞曲：增强低频，中高频适中
        PRESETS.put("dance", new short[]{700, 0, 0, 200, 300});
    }

    public static short[] getPreset(String name) {
        if (name == null) {
            return null;
        }
        return PRESETS.get(name.toLowerCase());
    }

    public static String[] getPresetNames() {
        return PRESETS.keySet().toArray(new String[0]);
    }

    public static boolean hasPreset(String name) {
        if (name == null) {
            return false;
        }
        return PRESETS.containsKey(name.toLowerCase());
    }
}
