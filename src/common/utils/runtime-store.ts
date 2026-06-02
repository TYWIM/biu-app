const PREFIX = "biu:";

const getRuntimeStore = async <T = unknown>(name: string): Promise<T | null> => {
  try {
    const raw = window.localStorage.getItem(PREFIX + name);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const setRuntimeStore = async <T = unknown>(name: string, value: T): Promise<void> => {
  try {
    window.localStorage.setItem(PREFIX + name, JSON.stringify(value));
  } catch {
    // ignore
  }
};

const clearRuntimeStore = async (name: string): Promise<void> => {
  try {
    window.localStorage.removeItem(PREFIX + name);
  } catch {
    // ignore
  }
};

const canUseRuntimeStore = (): boolean => true;

export { getRuntimeStore, setRuntimeStore, clearRuntimeStore, canUseRuntimeStore };
