import React, { useEffect, useState } from "react";

import { Autocomplete, AutocompleteItem } from "@heroui/react";

import { defaultAppSettings } from "@shared/settings/app-settings";

export interface FontSelectProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
}

interface FontItem {
  name: string;
  familyName: string;
}

export default function FontSelect({ value = defaultAppSettings.fontFamily, onChange, className }: FontSelectProps) {
  const [fonts, setFonts] = useState<FontItem[]>([]);

  const getFonts = async () => {
    const systemFont: FontItem[] = [{ name: "系统默认", familyName: defaultAppSettings.fontFamily }];
    setFonts(systemFont);
  };

  useEffect(() => {
    getFonts();
  }, []);

  const selectedValue = value === "system-default" ? "system-ui" : value;

  return (
    <Autocomplete
      aria-label="选择字体"
      size="lg"
      placeholder="选择字体"
      selectedKey={selectedValue}
      onSelectionChange={key => {
        if (key) onChange(String(key));
      }}
      defaultItems={fonts}
      className={className}
      listboxProps={{
        color: "primary",
        hideSelectedIcon: true,
      }}
    >
      {font => (
        <AutocompleteItem key={font.familyName ?? "system-ui"} style={{ fontFamily: font.familyName }}>
          {font.name}
        </AutocompleteItem>
      )}
    </Autocomplete>
  );
}
