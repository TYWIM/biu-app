import { Select, SelectItem } from "@heroui/react";
 
import useIsMobile from "@/common/hooks/use-is-mobile";
import SearchButton from "@/components/search-button";
 
export interface SearchProps {
  onKeywordSearch?: (keyword: string) => void;
  orderOptions?: { key: string; label: string }[];
  order?: string;
  onOrderChange?: (order: string) => void;
}
 
const SearchWithSort = ({ onKeywordSearch, orderOptions, order, onOrderChange }: SearchProps) => {
  const isMobile = useIsMobile();

  return (
    <div className={isMobile ? "flex w-full flex-col gap-2" : "flex items-center space-x-2"}>
      <SearchButton onSearch={onKeywordSearch} />
      {Boolean(orderOptions?.length) && (
        <Select
          radius="md"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={order ? new Set([order]) : new Set<string>()}
          onSelectionChange={keys => {
            if (keys === "all") return;
            if (keys instanceof Set && keys.size === 0) return;
            const selectedValue = keys instanceof Set ? Array.from(keys)[0] : keys;
            onOrderChange?.(selectedValue as string);
          }}
          items={orderOptions}
          listboxProps={{
            color: "primary",
            hideSelectedIcon: true,
          }}
          className={isMobile ? "w-full" : "max-w-xs"}
          classNames={{
            innerWrapper: isMobile ? "w-full" : "w-20",
          }}
        >
          {item => (
            <SelectItem key={item.key} textValue={item.label}>
              {item.label}
            </SelectItem>
          )}
        </Select>
      )}
    </div>
  );
};

export default SearchWithSort;
