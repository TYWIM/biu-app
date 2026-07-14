/**
 * Reliable CSRF token storage backed by localStorage.
 * On Capacitor/Android, CapacitorCookies may not persist cookies reliably,
 * so we store bili_jct explicitly whenever we see it.
 */

const CSRF_KEY = "biu:csrf_token";

export const saveCsrfToken = (value: string) => {
  if (value && value.length > 0) {
    try {
      window.localStorage.setItem(CSRF_KEY, value);
    } catch {
      // ignore
    }
  }
};

export const getCsrfToken = (): string | undefined => {
  try {
    const val = window.localStorage.getItem(CSRF_KEY);
    return val && val.length > 0 ? val : undefined;
  } catch {
    return undefined;
  }
};

export const clearCsrfToken = () => {
  try {
    window.localStorage.removeItem(CSRF_KEY);
  } catch {
    // ignore
  }
};
