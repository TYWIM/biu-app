import { RiPlayListLine } from "@remixicon/react";

import IconButton from "@/components/icon-button";
import { useModalStore } from "@/store/modal";

interface Props {
  className?: string;
  iconSize?: number;
  tooltip?: string;
}

const OpenPlaylistDrawerButton = ({ className, iconSize = 18, tooltip }: Props) => {
  const setOpen = useModalStore(s => s.setPlayListDrawerOpen);

  return (
    <IconButton aria-label="打开播放列表" tooltip={tooltip} onPress={() => setOpen(true)} className={className}>
      <RiPlayListLine size={iconSize} />
    </IconButton>
  );
};

export default OpenPlaylistDrawerButton;
