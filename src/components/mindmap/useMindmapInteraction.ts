/**
 * useMindmapInteraction Hook
 * Handles pan, zoom, and click interactions for the mindmap
 */

import { useState, useCallback, useRef } from 'react'
import type { ViewTransform } from './mindmap.types'

interface InteractionOptions {
  minScale: number
  maxScale: number
  scaleStep: number
}

const DEFAULT_OPTIONS: InteractionOptions = {
  minScale: 0.3,
  maxScale: 2.5,
  scaleStep: 0.15
}

export function useMindmapInteraction(options: Partial<InteractionOptions> = {}) {
  const { minScale, maxScale, scaleStep } = { ...DEFAULT_OPTIONS, ...options }

  const [transform, setTransform] = useState<ViewTransform>({
    x: 0,
    y: 0,
    scale: 1
  })

  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const transformStart = useRef({ x: 0, y: 0 })

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    setTransform(prev => {
      const delta = e.deltaY > 0 ? -scaleStep : scaleStep
      const newScale = Math.max(minScale, Math.min(maxScale, prev.scale + delta))

      // Zoom toward mouse position
      const scaleDiff = newScale - prev.scale
      const newX = prev.x - (mouseX - rect.width / 2) * (scaleDiff / prev.scale)
      const newY = prev.y - (mouseY - rect.height / 2) * (scaleDiff / prev.scale)

      return { x: newX, y: newY, scale: newScale }
    })
  }, [minScale, maxScale, scaleStep])

  // Handle mouse down for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start drag on left click and not on nodes
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('[data-mindmap-node]')) return

    setIsDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY }
    transformStart.current = { x: transform.x, y: transform.y }
  }, [transform.x, transform.y])

  // Handle mouse move for panning
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return

    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y

    setTransform(prev => ({
      ...prev,
      x: transformStart.current.x + dx,
      y: transformStart.current.y + dy
    }))
  }, [isDragging])

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Handle touch events for mobile
  const lastTouchDistance = useRef<number | null>(null)
  const lastTouchCenter = useRef({ x: 0, y: 0 })

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch - pan
      const target = e.target as HTMLElement
      if (target.closest('[data-mindmap-node]')) return

      setIsDragging(true)
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      transformStart.current = { x: transform.x, y: transform.y }
    } else if (e.touches.length === 2) {
      // Two finger touch - prepare for pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastTouchDistance.current = Math.hypot(dx, dy)
      lastTouchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2
      }
    }
  }, [transform.x, transform.y])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      // Single touch - pan
      const dx = e.touches[0].clientX - dragStart.current.x
      const dy = e.touches[0].clientY - dragStart.current.y

      setTransform(prev => ({
        ...prev,
        x: transformStart.current.x + dx,
        y: transformStart.current.y + dy
      }))
    } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      // Pinch zoom
      e.preventDefault()

      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const distance = Math.hypot(dx, dy)

      const scaleDelta = (distance - lastTouchDistance.current) * 0.01
      lastTouchDistance.current = distance

      setTransform(prev => {
        const newScale = Math.max(minScale, Math.min(maxScale, prev.scale + scaleDelta))
        return { ...prev, scale: newScale }
      })
    }
  }, [isDragging, minScale, maxScale])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    lastTouchDistance.current = null
  }, [])

  // Reset view
  const resetView = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 })
  }, [])

  // Zoom in/out controls
  const zoomIn = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      scale: Math.min(maxScale, prev.scale + scaleStep)
    }))
  }, [maxScale, scaleStep])

  const zoomOut = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(minScale, prev.scale - scaleStep)
    }))
  }, [minScale, scaleStep])

  return {
    transform,
    isDragging,
    handlers: {
      onWheel: handleWheel,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    },
    controls: {
      resetView,
      zoomIn,
      zoomOut
    }
  }
}
