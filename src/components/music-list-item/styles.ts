export const getMusicListItemGrid = (isCompact?: boolean, hidePubTime?: boolean) => {
  return isCompact
    ? hidePubTime
      ? "grid-cols-[auto_1fr_150px_100px_100px_auto]"
      : "grid-cols-[auto_1fr_150px_100px_110px_80px_auto]"
    : hidePubTime
      ? "grid-cols-[auto_1fr_100px_100px_auto]"
      : "grid-cols-[auto_1fr_100px_110px_80px_auto]";
};

export const getMusicListItemRowHeight = (isMobile?: boolean, isCompact?: boolean) => {
  if (isMobile) {
    return 82;
  }
  return isCompact ? 36 : 64;
};
