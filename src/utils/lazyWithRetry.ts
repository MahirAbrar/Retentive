import { lazy, ComponentType } from 'react'

/**
 * Wraps React.lazy with retry logic for chunk loading failures.
 * When a new deployment happens, old chunk files may no longer exist.
 * This detects that error and reloads the page to get fresh chunks.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const sessionKey = `chunk-reload-${window.location.pathname}`
    const hasReloaded = sessionStorage.getItem(sessionKey)

    try {
      const component = await importFn()
      // Clear the reload flag on success
      sessionStorage.removeItem(sessionKey)
      return component
    } catch (error) {
      // Check if this is a chunk loading error
      const isChunkError =
        error instanceof Error &&
        (error.message.includes('Failed to fetch dynamically imported module') ||
          error.message.includes('Loading chunk') ||
          error.message.includes('Loading CSS chunk'))

      // If chunk error and haven't reloaded yet, reload the page
      if (isChunkError && !hasReloaded) {
        sessionStorage.setItem(sessionKey, 'true')
        window.location.reload()
        // Return a never-resolving promise to prevent error UI flash
        return new Promise(() => {})
      }

      // If already reloaded or not a chunk error, throw to show error boundary
      throw error
    }
  })
}
