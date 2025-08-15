/**
 * Logger utility that only logs in development mode
 * This prevents console logs from appearing in production builds
 */

const isDevelopment = import.meta.env.DEV

class Logger {
  log(...args: any[]) {
    if (isDevelopment) {
      console.log(...args)
    }
  }

  error(...args: any[]) {
    if (isDevelopment) {
      console.error(...args)
    }
  }

  warn(...args: any[]) {
    if (isDevelopment) {
      console.warn(...args)
    }
  }

  info(...args: any[]) {
    if (isDevelopment) {
      console.info(...args)
    }
  }

  debug(...args: any[]) {
    if (isDevelopment) {
      console.debug(...args)
    }
  }

  group(...args: any[]) {
    if (isDevelopment) {
      console.group(...args)
    }
  }

  groupEnd() {
    if (isDevelopment) {
      console.groupEnd()
    }
  }

  table(...args: any[]) {
    if (isDevelopment) {
      console.table(...args)
    }
  }

  time(label: string) {
    if (isDevelopment) {
      console.time(label)
    }
  }

  timeEnd(label: string) {
    if (isDevelopment) {
      console.timeEnd(label)
    }
  }
}

export const logger = new Logger()

// For backward compatibility, export individual functions
export const log = logger.log.bind(logger)
export const error = logger.error.bind(logger)
export const warn = logger.warn.bind(logger)
export const info = logger.info.bind(logger)
export const debug = logger.debug.bind(logger)