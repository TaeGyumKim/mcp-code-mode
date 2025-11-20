/**
 * Structured logger for MCP Code Mode
 *
 * Uses stderr for logging (MCP standard: stdout for responses, stderr for logs)
 * Supports environment variable-based log level filtering
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  level?: LogLevel;
  data?: any;
  component?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// Get minimum log level from environment (default: info)
const MIN_LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || 'info';
const MIN_LOG_LEVEL_NUM = LOG_LEVELS[MIN_LOG_LEVEL] || LOG_LEVELS.info;

// Whether to enable debug logs (for backward compatibility)
const DEBUG_ENABLED = process.env.DEBUG === 'true' || MIN_LOG_LEVEL === 'debug';

/**
 * Log a message with optional structured data
 */
export function log(message: string, options: LogOptions = {}): void {
  const {
    level = 'info',
    data,
    component
  } = options;

  // Filter by log level
  if (LOG_LEVELS[level] < MIN_LOG_LEVEL_NUM) {
    return;
  }

  const timestamp = new Date().toISOString();
  const componentPrefix = component ? `[${component}]` : '';
  const levelPrefix = level.toUpperCase();

  let logMessage = `[${timestamp}] ${levelPrefix} ${componentPrefix} ${message}`;

  if (data !== undefined) {
    try {
      logMessage += `: ${JSON.stringify(data)}`;
    } catch {
      logMessage += `: [Unable to stringify data]`;
    }
  }

  process.stderr.write(logMessage + '\n');
}

/**
 * Log at debug level (only if DEBUG=true or LOG_LEVEL=debug)
 */
export function debug(message: string, data?: any, component?: string): void {
  if (DEBUG_ENABLED) {
    log(message, { level: 'debug', data, component });
  }
}

/**
 * Log at info level
 */
export function info(message: string, data?: any, component?: string): void {
  log(message, { level: 'info', data, component });
}

/**
 * Log at warn level
 */
export function warn(message: string, data?: any, component?: string): void {
  log(message, { level: 'warn', data, component });
}

/**
 * Log at error level
 */
export function error(message: string, data?: any, component?: string): void {
  log(message, { level: 'error', data, component });
}

/**
 * Create a logger with a fixed component name
 */
export function createLogger(component: string) {
  return {
    debug: (message: string, data?: any) => debug(message, data, component),
    info: (message: string, data?: any) => info(message, data, component),
    warn: (message: string, data?: any) => warn(message, data, component),
    error: (message: string, data?: any) => error(message, data, component),
    log: (message: string, options: Omit<LogOptions, 'component'> = {}) =>
      log(message, { ...options, component })
  };
}
