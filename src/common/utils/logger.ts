/**
 * Safe logger that uses electron-log in Electron environment
 * and falls back to console in other environments (Android/web).
 */

type LogFn = (...args: any[]) => void;

interface Logger {
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  debug: LogFn;
  log: LogFn;
}

let logger: Logger;

if (typeof window !== "undefined" && (window as any).electron) {
  try {
    // Dynamic import to avoid crash when electron-log is not available
    const electronLog = require("electron-log/renderer");
    logger = electronLog.default || electronLog;
  } catch {
    logger = console;
  }
} else {
  logger = console;
}

export default logger;
