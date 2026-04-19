import { useState } from "react";

import { Input } from "@heroui/react";
import { RiArrowRightSLine, RiSearchLine } from "@remixicon/react";
import { twMerge } from "tailwind-merge";

import IconButton from "@/components/icon-button";
import MusicPageList from "@/components/music-page-list";

interface Props {
  className?: string;
  style?: React.CSSProperties;
  onClose?: () => void;
  isMobile?: boolean;
}

const FullScreenPageList = ({
  ref,
  className,
  style,
  onClose,
  isMobile = false,
}: Props & { ref?: React.RefObject<HTMLDivElement | null> }) => {
  const [searchKeyword, setSearchKeyword] = useState("");

  return (
    <div
      ref={ref}
      className={twMerge(
        isMobile
          ? "flex flex-col overflow-hidden rounded-[28px] border border-white/10 bg-black/70 text-white shadow-[0_24px_56px_-28px_rgba(0,0,0,0.7)] ring-1 ring-white/8 backdrop-blur-2xl"
          : "flex flex-col overflow-hidden rounded-2xl bg-white/10 text-white ring-1 ring-white/12 backdrop-blur-md",
        className,
      )}
      style={style}
    >
      <div className={twMerge(isMobile ? "border-b border-white/10 px-4 pb-3 pt-3" : "flex w-full flex-none flex-row items-center justify-between space-x-1 border-b border-white/10 px-2 py-2") }>
        {isMobile ? (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">分集列表</div>
                <div className="mt-0.5 text-xs text-white/56">搜索并快速切换到当前视频的分集</div>
              </div>
              <IconButton
                variant="flat"
                onPress={onClose}
                className="size-9 min-w-9 rounded-full border border-white/10 bg-white/8 text-white hover:bg-white/14 hover:text-white"
              >
                <RiArrowRightSLine size={18} className="text-white/80" />
              </IconButton>
            </div>
            <Input
              classNames={{
                mainWrapper: "h-full",
                input: "text-sm text-white placeholder:text-white/34",
                inputWrapper: "min-h-11 rounded-full border border-white/10 bg-white/8 hover:bg-white/12 group-data-[focus=true]:bg-white/12",
              }}
              placeholder="搜索分集"
              size="sm"
              startContent={<RiSearchLine size={16} className="text-white/55" />}
              type="search"
              value={searchKeyword}
              onValueChange={setSearchKeyword}
            />
          </>
        ) : (
          <>
            <Input
              classNames={{
                mainWrapper: "h-full",
                input: "text-sm",
                inputWrapper: "bg-black/20 hover:bg-black/30 group-data-[focus=true]:bg-black/30",
              }}
              placeholder="搜索分集"
              size="sm"
              startContent={<RiSearchLine size={16} />}
              type="search"
              value={searchKeyword}
              onValueChange={setSearchKeyword}
            />
            <IconButton variant="flat" onPress={onClose} className="w-6 min-w-6">
              <RiArrowRightSLine size={16} className="text-white/80" />
            </IconButton>
          </>
        )}
      </div>
      <MusicPageList
        className={twMerge("h-full w-full flex-1", isMobile ? "px-2 pb-3 pt-2" : "p-1 pb-2")}
        hideCover
        itemClassName={twMerge(
          isMobile
            ? "h-10 min-h-10 rounded-[16px] px-2 py-1.5 hover:bg-white/8 data-[active=true]:bg-white/12 text-white/74 data-[active=true]:text-white [&_span.tabular-nums]:hidden"
            : "hover:bg-white/10 data-[active=true]:bg-primary/20 text-foreground/80 data-[active=true]:text-primary h-8 min-h-8 p-1 [&_span.tabular-nums]:hidden",
        )}
        itemHeight={isMobile ? 40 : 32}
        itemTitleClassName={isMobile ? "text-sm font-medium" : "text-sm"}
        onPressItem={onClose}
        searchKeyword={searchKeyword}
      />
    </div>
  );
};

export default FullScreenPageList;
