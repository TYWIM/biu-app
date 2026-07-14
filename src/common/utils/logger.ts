type LogFn = (...args: any[]) => void;

interface Logger {
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  debug: LogFn;
  log: LogFn;
}

const logger: Logger = console;

export default logger;
