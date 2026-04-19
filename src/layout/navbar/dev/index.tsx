import { useEffect, useState } from "react";

import { RiCodeLine } from "@remixicon/react";

import IconButton from "@/components/icon-button";

const Dev = () => {
  const [isDev, setIsDev] = useState(false);
  const electron = window.electron;

  useEffect(() => {
    if (!electron?.isDev) {
      setIsDev(false);
      return;
    }

    electron.isDev().then(setIsDev);
  }, [electron]);

  if (!isDev) {
    return null;
  }

  return (
    <IconButton onPress={() => electron?.toggleDevTools?.()}>
      <RiCodeLine size={18} />
    </IconButton>
  );
};

export default Dev;
