/**
 * Structured logger for MCP Code Mode
 *
 * Uses stderr for logging (MCP standard: stdout for responses, stderr for logs)
 * Supports environment variable-based log level filtering
 */
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};
// Get minimum log level from environment (default: info)
const MIN_LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const MIN_LOG_LEVEL_NUM = LOG_LEVELS[MIN_LOG_LEVEL] || LOG_LEVELS.info;
// Whether to enable debug logs (for backward compatibility)
const DEBUG_ENABLED = process.env.DEBUG === 'true' || MIN_LOG_LEVEL === 'debug';
/**
 * Log a message with optional structured data
 */
export function log(message, options = {}) {
    const { level = 'info', data, component } = options;
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
        }
        catch {
            logMessage += `: [Unable to stringify data]`;
        }
    }
    process.stderr.write(logMessage + '\n');
}
/**
 * Log at debug level (only if DEBUG=true or LOG_LEVEL=debug)
 */
export function debug(message, data, component) {
    if (DEBUG_ENABLED) {
        log(message, { level: 'debug', data, component });
    }
}
/**
 * Log at info level
 */
export function info(message, data, component) {
    log(message, { level: 'info', data, component });
}
/**
 * Log at warn level
 */
export function warn(message, data, component) {
    log(message, { level: 'warn', data, component });
}
/**
 * Log at error level
 */
export function error(message, data, component) {
    log(message, { level: 'error', data, component });
}
/**
 * Create a logger with a fixed component name
 */
export function createLogger(component) {
    return {
        debug: (message, data) => debug(message, data, component),
        info: (message, data) => info(message, data, component),
        warn: (message, data) => warn(message, data, component),
        error: (message, data) => error(message, data, component),
        log: (message, options = {}) => log(message, { ...options, component })
    };
}
//# sourceMappingURL=logger.js.map