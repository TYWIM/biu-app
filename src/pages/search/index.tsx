import React, { useRef, useState } from "react";

import { Chip, Input, Tabs, Tab } from "@heroui/react";
import { RiSearchLine } from "@remixicon/react";

import useIsMobile from "@/common/hooks/use-is-mobile";
import Empty from "@/components/empty";
import ScrollContainer, { type ScrollRefObject } from "@/components/scroll-container";
import { useSearchHistory } from "@/store/search-history";

import { SearchType, SearchTypeOptions } from "./search-type";
import UserList from "./user-list";
import VideoList from "./video-list";

const MobileSearchBar = () => {
  const addSearchHistory = useSearchHistory(s => s.add);
  const deleteSearchHistory = useSearchHistory(s => s.delete);
  const clearSearchHistory = useSearchHistory(s => s.clear);
  const searchHistoryItems = useSearchHistory(s => s.items);
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    if (!value.trim()) return;
    addSearchHistory(value.trim());
    setValue("");
  };

  return (
    <div className="px-4 pt-3 pb-2">
      <Input
        value={value}
        onValueChange={setValue}
        onKeyDown={e => {
          if (e.key === "Enter") handleSubmit();
        }}
        placeholder="搜索视频、用户"
        isClearable
        startContent={<RiSearchLine size={16} />}
        classNames={{
          inputWrapper:
            "bg-default-400/20 dark:bg-default-500/20 hover:bg-default-400/30 dark:hover:bg-default-500/30 group-data-[focus=true]:bg-default-400/30 dark:group-data-[focus=true]:bg-default-500/30",
        }}
      />
      {searchHistoryItems.length > 0 && (
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-foreground-500 text-xs">搜索历史</span>
            <span
              className="text-foreground-400 cursor-pointer text-xs"
              onClick={clearSearchHistory}
            >
              清除
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchHistoryItems.slice(0, 10).map(item => (
              <Chip
                key={item.time}
                size="sm"
                radius="md"
                isCloseable
                onClose={() => deleteSearchHistory(item)}
                onClick={() => {
                  addSearchHistory(item.value);
                }}
                className="min-w-0 cursor-pointer"
                classNames={{ content: "truncate" }}
              >
                {item.value}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Search = () => {
  const scrollerRef = useRef<ScrollRefObject>(null);
  const [searchType, setSearchType] = useState(SearchType.Video);
  const keyword = useSearchHistory(s => s.keyword);
  const isMobile = useIsMobile();

  if (!keyword) {
    return isMobile ? (
      <ScrollContainer className="h-full w-full">
        <MobileSearchBar />
        <Empty className="py-12" title="输入关键词开始搜索" />
      </ScrollContainer>
    ) : (
      <Empty />
    );
  }

  return (
    <ScrollContainer enableBackToTop ref={scrollerRef} className="h-full w-full">
      {isMobile && <MobileSearchBar />}
      <div className={isMobile ? "px-4 py-3" : "px-4"}>
        <h1>搜索【{keyword}】的结果</h1>
        <div className={isMobile ? "pt-3" : "flex items-center justify-between py-4"}>
          <Tabs
            variant="solid"
            size={isMobile ? "sm" : "md"}
            radius="md"
            classNames={{
              cursor: "rounded-medium",
              tabList: "max-w-full overflow-x-auto no-scrollbar",
            }}
            className={isMobile ? "w-full" : "-ml-1"}
            items={SearchTypeOptions}
            selectedKey={searchType}
            onSelectionChange={v => {
              setSearchType(v as SearchType);
            }}
          >
            {item => <Tab key={item.value} title={item.label} />}
          </Tabs>
        </div>
      </div>
      <>
        {searchType === SearchType.Video && (
          <VideoList
            keyword={keyword}
            getScrollElement={() => scrollerRef.current?.osInstance()?.elements().viewport || null}
          />
        )}
        {searchType === SearchType.User && (
          <UserList
            keyword={keyword}
            getScrollElement={() => scrollerRef.current?.osInstance()?.elements().viewport || null}
          />
        )}
      </>
    </ScrollContainer>
  );
};

export default Search;
