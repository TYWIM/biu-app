import { useState } from "react";

import { DateRangePicker as HeroDateRangePicker, Tab, Tabs, type DateValue, type RangeValue } from "@heroui/react";
import { getLocalTimeZone } from "@internationalized/date";
import dayjs from "dayjs";
import useIsMobile from "@/common/hooks/use-is-mobile";

interface Props {
  onDateRangeChange?: (range: { start?: number; end?: number } | null) => void;
}

const DateRangePicker = ({ onDateRangeChange }: Props) => {
  const [selectedKey, setSelectedKey] = useState<string>("all");
  const [dateRange, setDateRange] = useState<RangeValue<DateValue> | null>(null);
  const isMobile = useIsMobile();

  const handlePresetChange = (key: string) => {
    setSelectedKey(key);
    setDateRange(null); // Clear manual picker when preset is selected

    let start: number | undefined;
    let end: number | undefined;

    switch (key) {
      case "all":
        start = undefined;
        end = undefined;
        break;
      case "today":
        start = dayjs().startOf("day").valueOf();
        end = dayjs().endOf("day").valueOf();
        break;
      case "yesterday":
        start = dayjs().subtract(1, "days").startOf("day").valueOf();
        end = dayjs().subtract(1, "days").endOf("day").valueOf();
        break;
      case "week":
        start = dayjs().subtract(7, "days").startOf("day").valueOf();
        end = dayjs().endOf("day").valueOf();
        break;
    }

    onDateRangeChange?.(key === "all" ? null : { start, end });
  };

  const handleDateRangeChange = (value: RangeValue<DateValue> | null) => {
    setDateRange(value);
    setSelectedKey(""); // Clear preset selection when manual picker is used

    if (value && value.start && value.end) {
      const start = value.start.toDate(getLocalTimeZone()).getTime();
      const end = value.end.toDate(getLocalTimeZone()).getTime();
      onDateRangeChange?.({ start, end });
    } else {
      onDateRangeChange?.(null);
    }
  };

  return (
    <div className={isMobile ? "flex w-full flex-col gap-3" : "-ml-1 flex items-center space-x-4"}>
      <Tabs
        aria-label="时间范围"
        variant="light"
        selectedKey={selectedKey}
        onSelectionChange={key => handlePresetChange(key as string)}
        className={isMobile ? "w-full" : undefined}
        classNames={{
          cursor: "rounded-medium",
          tabList: "max-w-full overflow-x-auto no-scrollbar",
        }}
      >
        <Tab key="all" title="全部时间" />
        <Tab key="today" title="今天" />
        <Tab key="yesterday" title="昨天" />
        <Tab key="week" title="近一周" />
      </Tabs>

      <div className={isMobile ? "w-full" : "w-64"}>
        <HeroDateRangePicker
          aria-label="选择日期范围"
          // @ts-ignore 忽略类型检查，因为 HeroDateRangePicker 的类型定义有问题
          value={dateRange}
          onChange={handleDateRangeChange}
          visibleMonths={isMobile ? 1 : 2}
        />
      </div>
    </div>
  );
};

export default DateRangePicker;
