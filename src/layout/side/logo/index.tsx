import { useEffect, useState } from "react";

import { twMerge } from "tailwind-merge";

import { ReactComponent as LogoIcon } from "@/assets/icons/logo.svg";

interface LogoProps {
  isCollapsed: boolean;
}

const Logo = ({ isCollapsed }: LogoProps) => {
  const electron = typeof window !== "undefined" ? window.electron : undefined;
  const isMac = electron?.getPlatform?.() === "macos";
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (!isMac || !electron?.isFullScreen || !electron?.onWindowFullScreenChange) return;

    electron.isFullScreen().then(setIsFullScreen);
    const unlisten = electron.onWindowFullScreenChange(setIsFullScreen);

    return () => {
      unlisten?.();
    };
  }, [electron, isMac]);

  return (
    <>
      <div
        className={twMerge(
          "window-drag text-primary relative flex flex-none items-center py-3 pr-3 pl-4",
          isMac && !isFullScreen && "pt-8",
        )}
      >
        <div className="window-no-drag flex flex-1 items-center space-x-2">
          <LogoIcon className="h-10 w-10" />
          {!isCollapsed && <span className="text-2xl leading-none font-bold">Biu</span>}
        </div>
      </div>
    </>
  );
};

export default Logo;
