import { useEffect, useRef, useState } from 'react'
import { debounce } from '../utils/debounce'

interface UseAutoSaveOptions {
  delay?: number
  onSave: (data: any) => Promise<void>
  enabled?: boolean
}

export function useAutoSave<T>(
  data: T,
  options: UseAutoSaveOptions
) {
  const { delay = 1000, onSave, enabled = true } = options
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<Error | null>(null)
  
  const saveRef = useRef(
    debounce(async (dataToSave: T) => {
      if (!enabled) return
      
      setIsSaving(true)
      setError(null)
      
      try {
        await onSave(dataToSave)
        setLastSaved(new Date())
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to save'))
      } finally {
        setIsSaving(false)
      }
    }, delay)
  )

  useEffect(() => {
    if (enabled && data !== undefined && data !== null) {
      saveRef.current(data)
    }
  }, [data, enabled])

  return {
    isSaving,
    lastSaved,
    error
  }
}