type AudioQuality = "auto" | "lossless" | "high" | "medium" | "low";
type ThemeMode = "system" | "light" | "dark";
type PageTransition = "none" | "fade" | "slide" | "scale" | "slideUp";

interface AppSettings {
  fontFamily: string;
  primaryColor: string;
  /** 自定义背景色（为空表示使用主题默认） */
  backgroundColor: string;
  borderRadius: number;
  audioQuality: AudioQuality;
  followSystemVolume: boolean;
  hiddenMenuKeys: string[];
  displayMode: "card" | "list" | "compact";
  themeMode: ThemeMode;
  pageTransition: PageTransition;
  showSearchHistory: boolean;
  reportPlayHistory: boolean;
}
