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
/**
 * Log a message with optional structured data
 */
export declare function log(message: string, options?: LogOptions): void;
/**
 * Log at debug level (only if DEBUG=true or LOG_LEVEL=debug)
 */
export declare function debug(message: string, data?: any, component?: string): void;
/**
 * Log at info level
 */
export declare function info(message: string, data?: any, component?: string): void;
/**
 * Log at warn level
 */
export declare function warn(message: string, data?: any, component?: string): void;
/**
 * Log at error level
 */
export declare function error(message: string, data?: any, component?: string): void;
/**
 * Create a logger with a fixed component name
 */
export declare function createLogger(component: string): {
    debug: (message: string, data?: any) => void;
    info: (message: string, data?: any) => void;
    warn: (message: string, data?: any) => void;
    error: (message: string, data?: any) => void;
    log: (message: string, options?: Omit<LogOptions, "component">) => void;
};
export {};
//# sourceMappingURL=logger.d.ts.map