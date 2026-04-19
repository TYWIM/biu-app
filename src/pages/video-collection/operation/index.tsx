import { RiPlayFill, RiPlayListAddLine } from "@remixicon/react";

import { CollectionType } from "@/common/constants/collection";
import useIsMobile from "@/common/hooks/use-is-mobile";
import AsyncButton from "@/components/async-button";
import IconButton from "@/components/icon-button";
import SearchWithSort, { type SearchProps } from "@/components/search-with-sort";

import FavToggle, { type FavToggleProps } from "./fav-toggle";
import Menu, { type MenuProps } from "./menu";

interface Props extends FavToggleProps, SearchProps, MenuProps {
  loading?: boolean;
  onPlayAll: () => void;
  onAddToPlayList: () => void;
}

const Operations = ({
  loading,
  type,
  mediaCount,
  attr,
  isFavorite,
  isCreatedBySelf,
  onKeywordSearch,
  orderOptions,
  order,
  onOrderChange,
  onToggleFavorite,
  onPlayAll,
  onAddToPlayList,
  onClearInvalid,
}: Props) => {
  const isMobile = useIsMobile();

  return (
    <div className={isMobile ? "mb-4 flex flex-col gap-3" : "mb-4 flex items-center justify-between"}>
      <div className={isMobile ? "flex w-full flex-wrap items-center gap-2" : "flex items-center space-x-2"}>
        <AsyncButton
          color="primary"
          startContent={<RiPlayFill size={22} />}
          onPress={onPlayAll}
          className={isMobile ? "min-w-[140px] flex-1 dark:text-black" : "dark:text-black"}
        >
          播放全部
        </AsyncButton>
        <IconButton size="md" variant="flat" tooltip="添加到播放列表" onPress={onAddToPlayList}>
          <RiPlayListAddLine size={18} />
        </IconButton>
        {!loading && type !== CollectionType.VideoSeries && isCreatedBySelf !== true && (
          <FavToggle isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} />
        )}
        <Menu
          type={type}
          isCreatedBySelf={isCreatedBySelf}
          mediaCount={mediaCount}
          attr={attr}
          onClearInvalid={onClearInvalid}
        />
      </div>
      <div className={isMobile ? "w-full" : undefined}>
        <SearchWithSort
          onKeywordSearch={onKeywordSearch}
          orderOptions={orderOptions}
          order={order}
          onOrderChange={onOrderChange}
        />
      </div>
    </div>
  );
};

export default Operations;
