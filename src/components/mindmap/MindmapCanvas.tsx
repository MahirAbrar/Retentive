/**
 * MindmapCanvas Component
 * SVG container with pan/zoom controls and renders all nodes/connections
 */

import { useNavigate } from 'react-router-dom'
import { ZoomIn, ZoomOut, Maximize2, Expand, Shrink, Eye, EyeOff, Minus, Plus, Palette, Filter, Layout, Maximize, Minimize, RotateCcw } from 'lucide-react'
import { MindmapNode } from './MindmapNode'
import { MindmapConnection } from './MindmapConnection'
import { useMindmapInteraction } from './useMindmapInteraction'
import type { MindmapData, MindmapNode as NodeType, MindmapDimensions } from './mindmap.types'
import type { ColorMode, LayoutMode, FilterMode } from './MindmapView'

interface MindmapCanvasProps {
  data: MindmapData
  dimensions: MindmapDimensions
  expandedSubjects: Set<string>
  expandedTopics: Set<string>
  onToggleSubject: (subjectId: string) => void
  onToggleTopic: (topicId: string) => void
  isAllExpanded: boolean
  onToggleExpandAll: () => void
  forcePositions: Map<string, { x: number; y: number }>
  onStartDrag: (nodeId: string) => void
  onDrag: (nodeId: string, x: number, y: number) => void
  onEndDrag: (nodeId: string) => void
  isSimulating: boolean
  showItemLabels: boolean
  onToggleLabels: () => void
  nodeScale: number
  onNodeScaleChange: (scale: number) => void
  lineScale: number
  onLineScaleChange: (scale: number) => void
  colorMode: ColorMode
  onColorModeChange: (mode: ColorMode) => void
  layoutMode: LayoutMode
  onLayoutModeChange: (mode: LayoutMode) => void
  filterMode: FilterMode
  onFilterModeChange: (mode: FilterMode) => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
  isFullscreenSupported: boolean
  hasFilteredResults: boolean
  totalTopicsCount: number
}

export function MindmapCanvas({
  data,
  dimensions,
  expandedSubjects,
  expandedTopics,
  onToggleSubject,
  onToggleTopic,
  isAllExpanded,
  onToggleExpandAll,
  forcePositions,
  onStartDrag,
  onDrag,
  onEndDrag,
  isSimulating,
  showItemLabels,
  onToggleLabels,
  nodeScale,
  onNodeScaleChange,
  lineScale,
  onLineScaleChange,
  colorMode,
  onColorModeChange,
  layoutMode,
  onLayoutModeChange,
  filterMode,
  onFilterModeChange,
  isFullscreen,
  onToggleFullscreen,
  isFullscreenSupported,
  hasFilteredResults,
  totalTopicsCount
}: MindmapCanvasProps) {
  const navigate = useNavigate()
  const { transform, isDragging, handlers, controls } = useMindmapInteraction()

  const handleNodeClick = (node: NodeType) => {
    if (node.type === 'subject' || node.id === 'unassigned') {
      onToggleSubject(node.id)
    } else if (node.type === 'topic') {
      onToggleTopic(node.id)
    }
    // Items don't expand - they're leaf nodes
  }

  const handleNavigate = (topicId: string) => {
    navigate(`/topics/${topicId}`)
  }

  const { width, height, centerX, centerY } = dimensions

  return (
    <div
      style={{
        width: '100%',
        height: isFullscreen ? '100vh' : '500px',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'var(--color-background)',
        borderRadius: isFullscreen ? 0 : 'var(--radius-lg)',
        border: isFullscreen ? 'none' : '1px solid var(--color-border)',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      {...handlers}
    >
      {/* Zoom controls */}
      <div
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          zIndex: 10
        }}
      >
        <button
          onClick={controls.zoomIn}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            color: 'var(--color-text-primary)'
          }}
          title="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={controls.zoomOut}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            color: 'var(--color-text-primary)'
          }}
          title="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={controls.resetView}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            color: 'var(--color-text-primary)'
          }}
          title="Reset view"
        >
          <Maximize2 size={16} />
        </button>
        <div style={{ height: '8px' }} />
        <button
          onClick={onToggleExpandAll}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isAllExpanded ? 'var(--color-primary)' : 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            color: isAllExpanded ? 'var(--color-secondary)' : 'var(--color-text-primary)'
          }}
          title={isAllExpanded ? 'Collapse all' : 'Expand all'}
        >
          {isAllExpanded ? <Shrink size={16} /> : <Expand size={16} />}
        </button>
        {isFullscreenSupported && (
          <button
            onClick={onToggleFullscreen}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              color: 'var(--color-text-primary)'
            }}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        )}
        <div style={{ height: '8px' }} />
        {/* Show Item Labels Toggle */}
        <button
          onClick={onToggleLabels}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: showItemLabels ? 'var(--color-primary)' : 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            color: showItemLabels ? 'var(--color-secondary)' : 'var(--color-text-primary)'
          }}
          title={showItemLabels ? 'Hide item labels' : 'Show item labels'}
        >
          {showItemLabels ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        {/* Node Size Controls */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            marginTop: '4px',
            padding: '4px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <div
            style={{
              fontSize: '8px',
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            Nodes
          </div>
          <button
            onClick={() => onNodeScaleChange(Math.min(1.4, nodeScale + 0.1))}
            disabled={nodeScale >= 1.4}
            style={{
              width: '28px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: nodeScale >= 1.4 ? 'not-allowed' : 'pointer',
              color: 'var(--color-text-primary)',
              opacity: nodeScale >= 1.4 ? 0.5 : 1
            }}
            title="Increase node size"
          >
            <Plus size={12} />
          </button>
          <div
            style={{
              fontSize: '9px',
              color: 'var(--color-text-secondary)',
              textAlign: 'center',
              lineHeight: 1
            }}
          >
            {Math.round(nodeScale * 100)}%
          </div>
          <button
            onClick={() => onNodeScaleChange(Math.max(0.6, nodeScale - 0.1))}
            disabled={nodeScale <= 0.6}
            style={{
              width: '28px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: nodeScale <= 0.6 ? 'not-allowed' : 'pointer',
              color: 'var(--color-text-primary)',
              opacity: nodeScale <= 0.6 ? 0.5 : 1
            }}
            title="Decrease node size"
          >
            <Minus size={12} />
          </button>
        </div>
        {/* Line Length / Spacing Controls */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            marginTop: '4px',
            padding: '4px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <div
            style={{
              fontSize: '8px',
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            Spacing
          </div>
          <button
            onClick={() => onLineScaleChange(Math.min(1.5, lineScale + 0.1))}
            disabled={lineScale >= 1.5}
            style={{
              width: '28px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: lineScale >= 1.5 ? 'not-allowed' : 'pointer',
              color: 'var(--color-text-primary)',
              opacity: lineScale >= 1.5 ? 0.5 : 1
            }}
            title="Increase spacing between nodes"
          >
            <Plus size={12} />
          </button>
          <div
            style={{
              fontSize: '9px',
              color: 'var(--color-text-secondary)',
              textAlign: 'center',
              lineHeight: 1
            }}
          >
            {Math.round(lineScale * 100)}%
          </div>
          <button
            onClick={() => onLineScaleChange(Math.max(0.5, lineScale - 0.1))}
            disabled={lineScale <= 0.5}
            style={{
              width: '28px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: lineScale <= 0.5 ? 'not-allowed' : 'pointer',
              color: 'var(--color-text-primary)',
              opacity: lineScale <= 0.5 ? 0.5 : 1
            }}
            title="Decrease spacing between nodes"
          >
            <Minus size={12} />
          </button>
        </div>
        {/* Reset Controls Button */}
        {(nodeScale !== 1 || lineScale !== 1) && (
          <button
            onClick={() => {
              onNodeScaleChange(1)
              onLineScaleChange(1)
            }}
            style={{
              width: '32px',
              height: '32px',
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)'
            }}
            title="Reset node size and spacing to 100%"
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>

      {/* Scale indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: '1rem',
          right: '1rem',
          padding: '0.25rem 0.5rem',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '11px',
          color: 'var(--color-text-secondary)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        {isSimulating && (
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary)',
              animation: 'pulse 1s ease-in-out infinite'
            }}
          />
        )}
        {Math.round(transform.scale * 100)}%
      </div>

      {/* Empty filter state overlay */}
      {!hasFilteredResults && totalTopicsCount > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            zIndex: 5,
            backgroundColor: 'var(--color-surface)',
            padding: '2rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
            {filterMode === 'due' ? '✅' : filterMode === 'mastered' ? '📚' : filterMode === 'new' ? '🆕' : '🔍'}
          </div>
          <h4 className="h5" style={{ marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
            No {filterMode === 'due' ? 'due' : filterMode === 'mastered' ? 'mastered' : filterMode === 'new' ? 'new' : ''} topics found
          </h4>
          <p className="body-small" style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            {filterMode === 'due' && "Great job! No items are due for review right now."}
            {filterMode === 'mastered' && "Keep studying! No topics are fully mastered yet."}
            {filterMode === 'new' && "All your items have been reviewed at least once."}
          </p>
          <button
            onClick={() => onFilterModeChange('all')}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '12px',
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-secondary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer'
            }}
          >
            Show All Topics
          </button>
        </div>
      )}

      {/* SVG Canvas */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{
          display: 'block'
        }}
      >
        <g
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}
          style={{
            transformOrigin: `${centerX}px ${centerY}px`
          }}
        >
          {/* Render connections first (below nodes) */}
          <g className="connections">
            {data.connections.map(connection => {
              const sourcePos = forcePositions.get(connection.sourceId) || { x: connection.sourceX, y: connection.sourceY }
              const targetPos = forcePositions.get(connection.targetId) || { x: connection.targetX, y: connection.targetY }
              const adjustedConnection = {
                ...connection,
                sourceX: sourcePos.x,
                sourceY: sourcePos.y,
                targetX: targetPos.x,
                targetY: targetPos.y
              }
              return (
                <MindmapConnection
                  key={connection.id}
                  connection={adjustedConnection}
                />
              )
            })}
          </g>

          {/* Render nodes on top */}
          <g className="nodes">
            {data.nodes.map(node => {
              const forcePos = forcePositions.get(node.id)
              return (
                <MindmapNode
                  key={node.id}
                  node={node}
                  forcePosition={forcePos}
                  isExpanded={
                    node.type === 'subject'
                      ? expandedSubjects.has(node.id)
                      : node.type === 'topic'
                        ? expandedTopics.has(node.id)
                        : false
                  }
                  onClick={handleNodeClick}
                  onNavigate={handleNavigate}
                  onStartDrag={() => onStartDrag(node.id)}
                  onDrag={(x, y) => onDrag(node.id, x, y)}
                  onEndDrag={() => onEndDrag(node.id)}
                  scale={transform.scale}
                  showItemLabels={showItemLabels}
                  nodeScale={nodeScale}
                  colorMode={colorMode}
                />
              )
            })}
          </g>
        </g>
      </svg>

      {/* Left side controls - Color, Layout, Filter */}
      <div
        style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          zIndex: 10
        }}
      >
        {/* Color Mode */}
        <div
          style={{
            display: 'flex',
            gap: '2px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px'
          }}
        >
          <button
            onClick={() => onColorModeChange('subject')}
            style={{
              padding: '4px 8px',
              fontSize: '10px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              backgroundColor: colorMode === 'subject' ? 'var(--color-primary)' : 'transparent',
              color: colorMode === 'subject' ? 'var(--color-secondary)' : 'var(--color-text-secondary)'
            }}
            title="Color by subject"
          >
            <Palette size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Subject
          </button>
          <button
            onClick={() => onColorModeChange('mastery')}
            style={{
              padding: '4px 8px',
              fontSize: '10px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              backgroundColor: colorMode === 'mastery' ? 'var(--color-primary)' : 'transparent',
              color: colorMode === 'mastery' ? 'var(--color-secondary)' : 'var(--color-text-secondary)'
            }}
            title="Color by mastery level"
          >
            Mastery
          </button>
        </div>

        {/* Layout Mode */}
        <div
          style={{
            display: 'flex',
            gap: '2px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px'
          }}
        >
          <button
            onClick={() => onLayoutModeChange('radial')}
            style={{
              padding: '4px 8px',
              fontSize: '10px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              backgroundColor: layoutMode === 'radial' ? 'var(--color-primary)' : 'transparent',
              color: layoutMode === 'radial' ? 'var(--color-secondary)' : 'var(--color-text-secondary)'
            }}
            title="Radial layout"
          >
            <Layout size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Radial
          </button>
          <button
            onClick={() => onLayoutModeChange('horizontal')}
            style={{
              padding: '4px 8px',
              fontSize: '10px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              backgroundColor: layoutMode === 'horizontal' ? 'var(--color-primary)' : 'transparent',
              color: layoutMode === 'horizontal' ? 'var(--color-secondary)' : 'var(--color-text-secondary)'
            }}
            title="Horizontal tree layout"
          >
            H-Tree
          </button>
          <button
            onClick={() => onLayoutModeChange('vertical')}
            style={{
              padding: '4px 8px',
              fontSize: '10px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              backgroundColor: layoutMode === 'vertical' ? 'var(--color-primary)' : 'transparent',
              color: layoutMode === 'vertical' ? 'var(--color-secondary)' : 'var(--color-text-secondary)'
            }}
            title="Vertical tree layout"
          >
            V-Tree
          </button>
        </div>

        {/* Filter Mode */}
        <div
          style={{
            display: 'flex',
            gap: '2px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px',
            flexWrap: 'wrap',
            maxWidth: '180px'
          }}
        >
          <button
            onClick={() => onFilterModeChange('all')}
            style={{
              padding: '4px 8px',
              fontSize: '10px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              backgroundColor: filterMode === 'all' ? 'var(--color-primary)' : 'transparent',
              color: filterMode === 'all' ? 'var(--color-secondary)' : 'var(--color-text-secondary)'
            }}
            title="Show all topics"
          >
            <Filter size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            All
          </button>
          <button
            onClick={() => onFilterModeChange('due')}
            style={{
              padding: '4px 8px',
              fontSize: '10px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              backgroundColor: filterMode === 'due' ? 'var(--color-warning)' : 'transparent',
              color: filterMode === 'due' ? 'white' : 'var(--color-text-secondary)'
            }}
            title="Show topics with due items"
          >
            Due
          </button>
          <button
            onClick={() => onFilterModeChange('mastered')}
            style={{
              padding: '4px 8px',
              fontSize: '10px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              backgroundColor: filterMode === 'mastered' ? 'var(--color-success)' : 'transparent',
              color: filterMode === 'mastered' ? 'white' : 'var(--color-text-secondary)'
            }}
            title="Show mastered topics"
          >
            Mastered
          </button>
          <button
            onClick={() => onFilterModeChange('new')}
            style={{
              padding: '4px 8px',
              fontSize: '10px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              backgroundColor: filterMode === 'new' ? 'var(--color-info)' : 'transparent',
              color: filterMode === 'new' ? 'white' : 'var(--color-text-secondary)'
            }}
            title="Show topics with new items"
          >
            New
          </button>
        </div>
      </div>

      {/* Instructions hint */}
      <div
        style={{
          position: 'absolute',
          bottom: '1rem',
          left: '1rem',
          padding: '0.5rem 0.75rem',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '11px',
          color: 'var(--color-text-secondary)',
          zIndex: 10,
          maxWidth: '260px'
        }}
      >
        Click to expand • Double-click topic to view • Drag nodes
      </div>
    </div>
  )
}
