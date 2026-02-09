/**
 * MindmapNode Component
 * Renders circle nodes for subjects, topics, and items with icons and mastery glow
 */

import { memo, useState, useCallback, useRef } from 'react'
import type { MindmapNode as NodeType } from './mindmap.types'
import type { ColorMode } from './MindmapView'
import { getIconComponent } from '../../utils/icons'

// Check if string is an emoji (starts with emoji character, not ascii)
function isEmoji(str: string | undefined): boolean {
  if (!str) return false
  // Emojis are typically > 255 in char code, icon names are ascii
  return str.charCodeAt(0) > 255
}

interface MindmapNodeProps {
  node: NodeType
  forcePosition?: { x: number; y: number }
  isExpanded?: boolean
  onClick?: (node: NodeType) => void
  onNavigate?: (topicId: string) => void
  onStartDrag?: () => void
  onDrag?: (x: number, y: number) => void
  onEndDrag?: () => void
  scale?: number
  showItemLabels?: boolean
  nodeScale?: number
  colorMode?: ColorMode
}

// Get mastery-based color
function getMasteryColor(masteryPercentage: number): string {
  if (masteryPercentage >= 0.8) return 'var(--color-success)' // Green - mastered
  if (masteryPercentage >= 0.6) return 'var(--color-info)' // Blue - good progress
  if (masteryPercentage >= 0.3) return 'var(--color-warning)' // Orange - in progress
  return 'var(--color-error)' // Red - needs work
}

export const MindmapNode = memo(function MindmapNode({
  node,
  forcePosition,
  isExpanded = false,
  onClick,
  onNavigate,
  onStartDrag,
  onDrag,
  onEndDrag,
  scale = 1,
  showItemLabels = false,
  nodeScale = 1,
  colorMode = 'subject'
}: MindmapNodeProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const hasDragged = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const { type, label, icon, color: subjectColor, masteryPercentage, x, y } = node

  // Determine color based on colorMode
  const color = type === 'center'
    ? 'var(--color-primary)'
    : colorMode === 'mastery'
      ? getMasteryColor(masteryPercentage)
      : subjectColor

  // Use force position if available, otherwise use node's base position
  const posX = forcePosition?.x ?? x
  const posY = forcePosition?.y ?? y

  // Base node sizing by type
  const baseRadius = type === 'center' ? 50 : type === 'subject' ? 40 : type === 'topic' ? 28 : 18
  const baseFontSize = type === 'center' ? 12 : type === 'subject' ? 11 : type === 'topic' ? 10 : 8
  const baseIconSize = type === 'center' ? 24 : type === 'subject' ? 20 : type === 'topic' ? 16 : 12

  // Apply scale
  const radius = baseRadius * nodeScale
  const fontSize = baseFontSize * nodeScale
  const iconSize = baseIconSize * nodeScale

  // Calculate glow effect for high mastery (>80%)
  const hasGlow = masteryPercentage > 0.8
  const glowIntensity = hasGlow ? 8 + (masteryPercentage - 0.8) * 20 : 0

  // Calculate fill opacity based on mastery
  const fillOpacity = type === 'item'
    ? 0.15 + masteryPercentage * 0.4
    : 0.1 + masteryPercentage * 0.3

  // Truncate label if too long
  const maxLabelLength = type === 'item' ? 10 : type === 'topic' ? 12 : 16
  const displayLabel = label.length > maxLabelLength
    ? label.substring(0, maxLabelLength - 2) + '...'
    : label

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Don't trigger click if we just finished dragging
    if (hasDragged.current) {
      hasDragged.current = false
      return
    }
    if (onClick) {
      onClick(node)
    }
  }, [onClick, node])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Double-click on topic navigates to topic page
    if (type === 'topic' && onNavigate) {
      onNavigate(node.id)
    }
  }, [type, node.id, onNavigate])

  // Drag handlers for force simulation
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start drag on left click
    if (e.button !== 0) return
    e.stopPropagation()
    setIsDragging(true)
    hasDragged.current = false
    dragStart.current = { x: e.clientX, y: e.clientY }
    // Notify force simulation to fix this node's position
    onStartDrag?.()
  }, [onStartDrag])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !onDrag) return
    e.stopPropagation()
    const deltaX = (e.clientX - dragStart.current.x) / scale
    const deltaY = (e.clientY - dragStart.current.y) / scale
    // Only count as drag if moved more than 3 pixels
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      hasDragged.current = true
    }
    dragStart.current = { x: e.clientX, y: e.clientY }
    // Update fixed position in force simulation (absolute position, not delta)
    onDrag(posX + deltaX, posY + deltaY)
  }, [isDragging, onDrag, scale, posX, posY])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      e.stopPropagation()
      setIsDragging(false)
      // Release the node in force simulation
      onEndDrag?.()
    }
  }, [isDragging, onEndDrag])

  // Get icon for item based on mastery
  const getItemIcon = () => {
    if (masteryPercentage >= 1) return '✓'
    if (masteryPercentage >= 0.6) return '◐'
    return '○'
  }

  return (
    <g
      data-mindmap-node
      transform={`translate(${posX}, ${posY})`}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        if (isDragging) {
          setIsDragging(false)
          onEndDrag?.()
        }
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Glow filter for high mastery */}
      {hasGlow && (
        <defs>
          <filter id={`glow-${node.id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={glowIntensity / 2} result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}

      {/* Main circle */}
      <circle
        r={radius}
        fill={type === 'center' ? 'var(--color-surface)' : color}
        fillOpacity={type === 'center' ? 1 : fillOpacity}
        stroke={color}
        strokeWidth={isHovered ? 3 : type === 'item' ? 1.5 : 2}
        filter={hasGlow ? `url(#glow-${node.id})` : undefined}
        style={{
          transition: 'stroke-width 0.2s ease, fill-opacity 0.3s ease'
        }}
      />

      {/* Progress ring for subjects, topics, and center (not items) */}
      {type !== 'item' && (
        <circle
          r={radius - 4}
          fill="none"
          stroke={color}
          strokeWidth={type === 'topic' ? 2 : 3}
          strokeDasharray={`${masteryPercentage * (2 * Math.PI * (radius - 4))} ${2 * Math.PI * (radius - 4)}`}
          strokeDashoffset={(2 * Math.PI * (radius - 4)) * 0.25}
          strokeLinecap="round"
          opacity={0.8}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '0 0'
          }}
        />
      )}

      {/* Icon rendering */}
      {type === 'center' ? (
        <text
          y={-8}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: `${iconSize}px`,
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        >
          🧠
        </text>
      ) : type === 'item' ? (
        <text
          y={0}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: `${iconSize}px`,
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        >
          {getItemIcon()}
        </text>
      ) : (
        // For subjects and topics - check if icon is emoji or Lucide icon name
        isEmoji(icon) ? (
          <text
            y={type === 'subject' ? -4 : -2}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize: `${iconSize}px`,
              pointerEvents: 'none',
              userSelect: 'none'
            }}
          >
            {icon}
          </text>
        ) : (
          <foreignObject
            x={-iconSize / 2}
            y={type === 'subject' ? -iconSize / 2 - 4 : -iconSize / 2 - 2}
            width={iconSize}
            height={iconSize}
            style={{ pointerEvents: 'none' }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-primary)'
              }}
            >
              {(() => {
                const IconComponent = icon ? getIconComponent(icon) : null
                return IconComponent ? <IconComponent size={iconSize - 4} /> : null
              })()}
            </div>
          </foreignObject>
        )
      )}

      {/* Label - positioned below for non-items, shown for items only when showItemLabels is enabled */}
      {(type !== 'item' || showItemLabels) && (
        <text
          y={type === 'center' ? 14 * nodeScale : type === 'subject' ? 12 * nodeScale : type === 'topic' ? 8 * nodeScale : radius + 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--color-text-primary)"
          style={{
            fontSize: `${fontSize}px`,
            fontWeight: type === 'center' ? 600 : type === 'subject' ? 500 : 400,
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        >
          {displayLabel}
        </text>
      )}

      {/* Expand/collapse indicator for subjects and topics */}
      {(type === 'subject' || type === 'topic') && (
        <text
          y={radius + 12}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--color-text-secondary)"
          style={{
            fontSize: '10px',
            pointerEvents: 'none',
            userSelect: 'none',
            opacity: isHovered ? 1 : 0.6,
            transition: 'opacity 0.2s ease'
          }}
        >
          {isExpanded ? '−' : '+'}
        </text>
      )}

      {/* Tooltip on hover */}
      {isHovered && (
        <g transform={`translate(0, ${-radius - 35})`}>
          <rect
            x={type === 'item' ? -80 : -60}
            y={-22}
            width={type === 'item' ? 160 : 120}
            height={type === 'item' ? 44 : 40}
            rx={6}
            fill="var(--color-surface)"
            stroke="var(--color-border)"
            strokeWidth={1}
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
            }}
          />
          <text
            y={-8}
            textAnchor="middle"
            fill="var(--color-text-primary)"
            style={{ fontSize: '11px', fontWeight: 500 }}
          >
            {label.length > 25 ? label.substring(0, 23) + '...' : label}
          </text>
          <text
            y={8}
            textAnchor="middle"
            fill="var(--color-text-secondary)"
            style={{ fontSize: '10px' }}
          >
            {Math.round(masteryPercentage * 100)}% mastered
          </text>
          {type === 'topic' && (
            <text
              y={20}
              textAnchor="middle"
              fill="var(--color-text-tertiary)"
              style={{ fontSize: '9px', fontStyle: 'italic' }}
            >
              Double-click to view
            </text>
          )}
        </g>
      )}
    </g>
  )
})
