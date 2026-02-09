/**
 * MindmapConnection Component
 * Renders SVG lines between nodes with mastery-based styling
 */

import { memo } from 'react'
import type { MindmapConnection as ConnectionType } from './mindmap.types'

interface MindmapConnectionProps {
  connection: ConnectionType
}

export const MindmapConnection = memo(function MindmapConnection({
  connection
}: MindmapConnectionProps) {
  const { sourceX, sourceY, targetX, targetY, masteryPercentage, color } = connection

  // Calculate line styling based on mastery
  // Opacity: 20% (no mastery) → 100% (fully mastered)
  const strokeOpacity = 0.2 + masteryPercentage * 0.8

  // Width: 1px → 4px based on mastery
  const strokeWidth = 1 + masteryPercentage * 3

  // Dashed for < 30% mastery
  const strokeDasharray = masteryPercentage < 0.3 ? '4,4' : 'none'

  // Calculate control point for curved line
  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2

  // Add slight curve based on angle
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const distance = Math.hypot(dx, dy)
  const curveOffset = distance * 0.1

  // Perpendicular offset for curve
  const perpX = -dy / distance * curveOffset
  const perpY = dx / distance * curveOffset

  const controlX = midX + perpX
  const controlY = midY + perpY

  return (
    <path
      d={`M ${sourceX} ${sourceY} Q ${controlX} ${controlY} ${targetX} ${targetY}`}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeOpacity={strokeOpacity}
      strokeDasharray={strokeDasharray}
      strokeLinecap="round"
      style={{
        transition: 'stroke-opacity 0.3s ease, stroke-width 0.3s ease'
      }}
    />
  )
})
