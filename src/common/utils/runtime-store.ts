type RuntimeElectronStoreApi = {
  getStore?: ElectronAPI["getStore"];
  setStore?: ElectronAPI["setStore"];
  clearStore?: ElectronAPI["clearStore"];
};

const getElectronStoreApi = (): RuntimeElectronStoreApi => {
  if (typeof window === "undefined") {
    return {
      getStore: undefined,
      setStore: undefined,
      clearStore: undefined,
    };
  }

  const electron = (window as Window & { electron?: Partial<ElectronAPI> }).electron;

  return {
    getStore: electron?.getStore,
    setStore: electron?.setStore,
    clearStore: electron?.clearStore,
  };
};

const isLocalStorageAvailable = () => {
  if (typeof window === "undefined") return false;

  try {
    return typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
};

const getLocalStorageKey = (name: StoreName) => `biu:${name}`;

const readLocalStorageStore = <N extends StoreName>(name: N): StoreDataMap[N] | undefined => {
  if (!isLocalStorageAvailable()) return undefined;

  try {
    const raw = window.localStorage.getItem(getLocalStorageKey(name));
    if (!raw) return undefined;
    return JSON.parse(raw) as StoreDataMap[N];
  } catch {
    return undefined;
  }
};

const writeLocalStorageStore = <N extends StoreName>(name: N, value: StoreDataMap[N]) => {
  if (!isLocalStorageAvailable()) return;

  try {
    window.localStorage.setItem(getLocalStorageKey(name), JSON.stringify(value));
  } catch {
    return;
  }
};

const removeLocalStorageStore = (name: StoreName) => {
  if (!isLocalStorageAvailable()) return;

  try {
    window.localStorage.removeItem(getLocalStorageKey(name));
  } catch {
    return;
  }
};

export const canUseRuntimeStore = () => {
  const { getStore, setStore } = getElectronStoreApi();

  if (typeof getStore === "function" && typeof setStore === "function") {
    return true;
  }

  return isLocalStorageAvailable();
};

export const getRuntimeStore = async <N extends StoreName>(name: N): Promise<StoreDataMap[N] | undefined> => {
  const { getStore } = getElectronStoreApi();

  if (typeof getStore === "function") {
    return getStore(name);
  }

  return readLocalStorageStore(name);
};

export const setRuntimeStore = async <N extends StoreName>(name: N, value: StoreDataMap[N]) => {
  const { setStore } = getElectronStoreApi();

  if (typeof setStore === "function") {
    await setStore(name, value);
    return;
  }

  writeLocalStorageStore(name, value);
};

export const clearRuntimeStore = async (name: StoreName) => {
  const { clearStore } = getElectronStoreApi();

  if (typeof clearStore === "function") {
    await clearStore(name);
    return;
  }

  removeLocalStorageStore(name);
};
