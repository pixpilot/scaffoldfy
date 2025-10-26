/**
 * Logger utility with support for different log levels
 * Supports debug mode for verbose logging
 */

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error';

/**
 * Global debug mode flag
 */
let isDebugMode = false;

/**
 * Set debug mode globally
 */
export function setDebugMode(enabled: boolean): void {
  isDebugMode = enabled;
}

/**
 * Get current debug mode state
 */
export function isDebugEnabled(): boolean {
  return isDebugMode;
}

/**
 * Log symbols for different log levels
 */
const LOG_SYMBOLS = {
  debug: '🐛',
  info: 'ℹ',
  success: '✓',
  warn: '⚠',
  error: '✗',
};

/**
 * Color codes for different log levels
 */
const LOG_COLORS = {
  debug: '\x1B[35m', // Magenta
  info: '\x1B[36m', // Cyan
  success: '\x1B[32m', // Green
  warn: '\x1B[33m', // Yellow
  error: '\x1B[31m', // Red
};

const RESET_COLOR = '\x1B[0m';

/**
 * Log a debug message (only shown when debug mode is enabled)
 */
export function debug(message: string): void {
  if (!isDebugMode) {
    return;
  }

  console.log(`${LOG_COLORS.debug}${LOG_SYMBOLS.debug} ${message}${RESET_COLOR}`);
}

/**
 * Log an info message
 */
export function info(message: string): void {
  console.log(`${LOG_COLORS.info}${LOG_SYMBOLS.info} ${message}${RESET_COLOR}`);
}

/**
 * Log a success message
 */
export function success(message: string): void {
  console.log(`${LOG_COLORS.success}${LOG_SYMBOLS.success} ${message}${RESET_COLOR}`);
}

/**
 * Log a warning message
 */
export function warn(message: string): void {
  console.log(`${LOG_COLORS.warn}${LOG_SYMBOLS.warn} ${message}${RESET_COLOR}`);
}

/**
 * Log an error message
 */
export function error(message: string): void {
  console.log(`${LOG_COLORS.error}${LOG_SYMBOLS.error} ${message}${RESET_COLOR}`);
}

/**
 * Generic log function with type parameter (for backward compatibility)
 */
export function log(message: string, type: LogLevel = 'info'): void {
  switch (type) {
    case 'debug':
      debug(message);
      break;
    case 'info':
      info(message);
      break;
    case 'success':
      success(message);
      break;
    case 'warn':
      warn(message);
      break;
    case 'error':
      error(message);
      break;
  }
}
