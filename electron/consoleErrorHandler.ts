// Prevent EIO errors when console output stream is broken
export function setupConsoleErrorHandler() {
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;

  // Override console methods to catch EIO errors
  console.error = (...args: any[]) => {
    try {
      originalConsoleError.apply(console, args);
    } catch (error: any) {
      // Silently ignore EIO errors
      if (error?.code !== 'EIO') {
        // If it's not an EIO error, try to at least log to a file or memory
        // but don't throw
      }
    }
  };

  console.log = (...args: any[]) => {
    try {
      originalConsoleLog.apply(console, args);
    } catch (error: any) {
      // Silently ignore EIO errors
      if (error?.code !== 'EIO') {
        // Ignore other console errors too
      }
    }
  };

  console.warn = (...args: any[]) => {
    try {
      originalConsoleWarn.apply(console, args);
    } catch (error: any) {
      // Silently ignore EIO errors
      if (error?.code !== 'EIO') {
        // Ignore other console errors too
      }
    }
  };

  // Handle uncaught exceptions to prevent app crashes
  process.on('uncaughtException', (error: Error) => {
    // Check if it's an EIO error from console operations
    if (error.message && error.message.includes('write EIO')) {
      // Silently ignore console EIO errors
      return;
    }

    // For other uncaught exceptions, try to log them safely
    try {
      originalConsoleError('Uncaught Exception:', error);
    } catch {
      // If we can't log, at least don't crash
    }
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    try {
      originalConsoleError('Unhandled Rejection at:', promise, 'reason:', reason);
    } catch {
      // If we can't log, at least don't crash
    }
  });
}