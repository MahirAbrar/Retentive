/**
 * MindmapView Component
 * Main container that transforms subject/topic data into mindmap visualization
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { MindmapCanvas } from './MindmapCanvas'
import { MindmapLegend } from './MindmapLegend'
import { useMindmapLayout } from './useMindmapLayout'
import { useForceSimulation } from './useForceSimulation'
import type { SubjectNodeData, TopicNodeData, ItemNodeData, MindmapDimensions } from './mindmap.types'
import type { SubjectWithStats } from '../../types/subject'
import type { LearningItem } from '../../types/database'

interface TopicWithStats {
  id: string
  name: string
  subject_id?: string | null
  masteredCount: number
  itemCount: number
  items?: LearningItem[]
}

interface MindmapViewProps {
  subjects: SubjectWithStats[]
  topics: TopicWithStats[]
}

export type ColorMode = 'subject' | 'mastery'
export type LayoutMode = 'radial' | 'horizontal' | 'vertical'
export type FilterMode = 'all' | 'due' | 'mastered' | 'new'

export function MindmapView({ subjects, topics }: MindmapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [isAllExpanded, setIsAllExpanded] = useState(false)
  const [showItemLabels, setShowItemLabels] = useState(false)
  const [nodeScale, setNodeScale] = useState(1) // Range: 0.6 to 1.4
  const [lineScale, setLineScale] = useState(1) // Range: 0.5 to 1.5
  const [colorMode, setColorMode] = useState<ColorMode>('subject')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('radial')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Check if fullscreen API is supported
  const isFullscreenSupported = typeof document !== 'undefined' &&
    (document.fullscreenEnabled ||
     // @ts-expect-error - vendor prefixes for older browsers
     document.webkitFullscreenEnabled ||
     // @ts-expect-error - vendor prefixes for older browsers
     document.mozFullScreenEnabled ||
     // @ts-expect-error - vendor prefixes for older browsers
     document.msFullscreenEnabled)

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    // Vendor prefixes for older browsers
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [])

  // Toggle fullscreen with fallback for older browsers
  const handleToggleFullscreen = useCallback(() => {
    if (!containerRef.current || !isFullscreenSupported) return

    const elem = containerRef.current as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>
      mozRequestFullScreen?: () => Promise<void>
      msRequestFullscreen?: () => Promise<void>
    }
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void>
      mozCancelFullScreen?: () => Promise<void>
      msExitFullscreen?: () => Promise<void>
      webkitFullscreenElement?: Element
      mozFullScreenElement?: Element
      msFullscreenElement?: Element
    }

    const isCurrentlyFullscreen = document.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement

    if (isCurrentlyFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen()
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen()
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen()
      }
    } else {
      if (elem.requestFullscreen) {
        elem.requestFullscreen()
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen()
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen()
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen()
      }
    }
  }, [isFullscreenSupported])

  // Reset expanded state when filter changes to avoid confusion
  useEffect(() => {
    // When filter changes, collapse everything to show fresh filtered view
    if (filterMode !== 'all') {
      setExpandedSubjects(new Set())
      setExpandedTopics(new Set())
      setIsAllExpanded(false)
    }
  }, [filterMode])

  // Transform subjects to internal format
  const subjectNodes: SubjectNodeData[] = useMemo(() => {
    return subjects.map(subject => ({
      id: subject.id,
      name: subject.name,
      icon: subject.icon,
      color: subject.color,
      masteredCount: subject.masteredCount,
      itemCount: subject.itemCount,
      topicCount: subject.topicCount
    }))
  }, [subjects])

  // Filter topics based on filterMode
  const filteredTopics = useMemo(() => {
    if (filterMode === 'all') return topics

    return topics.filter(topic => {
      const items = topic.items || []
      const now = new Date()

      switch (filterMode) {
        case 'due':
          // Has items that are due (next_review_at <= now)
          return items.some(item => {
            if (!item.next_review_at) return false
            return new Date(item.next_review_at) <= now
          })
        case 'mastered':
          // All items are mastered
          return topic.itemCount > 0 && topic.masteredCount === topic.itemCount
        case 'new':
          // Has items with 0 reviews
          return items.some(item => item.review_count === 0)
        default:
          return true
      }
    })
  }, [topics, filterMode])

  // Transform topics to internal format (including items)
  const topicNodes: TopicNodeData[] = useMemo(() => {
    return filteredTopics.map(topic => ({
      id: topic.id,
      name: topic.name,
      subjectId: topic.subject_id || null,
      masteredCount: topic.masteredCount,
      itemCount: topic.itemCount,
      items: (topic.items || []).map((item): ItemNodeData => ({
        id: item.id,
        content: item.content,
        reviewCount: item.review_count,
        isMastered: item.mastery_status === 'mastered' || item.review_count >= 5
      }))
    }))
  }, [filteredTopics])

  // Fixed dimensions for the mindmap
  const dimensions: MindmapDimensions = useMemo(() => ({
    width: 800,
    height: 500,
    centerX: 400,
    centerY: 250
  }), [])

  // Calculate layout
  const mindmapData = useMindmapLayout(
    subjectNodes,
    topicNodes,
    expandedSubjects,
    expandedTopics,
    dimensions,
    layoutMode
  )

  // Apply force simulation for physics-based positioning
  const {
    positions: forcePositions,
    startDrag,
    drag,
    endDrag,
    isSimulating
  } = useForceSimulation(mindmapData, dimensions, true, nodeScale, lineScale)

  // Toggle subject expansion
  const handleToggleSubject = useCallback((subjectId: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev)
      if (next.has(subjectId)) {
        next.delete(subjectId)
      } else {
        next.add(subjectId)
      }
      return next
    })
  }, [])

  // Toggle topic expansion
  const handleToggleTopic = useCallback((topicId: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev)
      if (next.has(topicId)) {
        next.delete(topicId)
      } else {
        next.add(topicId)
      }
      return next
    })
  }, [])

  // Toggle expand all
  const handleToggleExpandAll = useCallback(() => {
    if (isAllExpanded) {
      // Collapse all
      setExpandedSubjects(new Set())
      setExpandedTopics(new Set())
      setIsAllExpanded(false)
    } else {
      // Expand all subjects
      const allSubjectIds = new Set(subjects.map(s => s.id))
      // Add 'unassigned' if there are unassigned topics
      const hasUnassigned = topics.some(t => !t.subject_id)
      if (hasUnassigned) {
        allSubjectIds.add('unassigned')
      }
      setExpandedSubjects(allSubjectIds)
      // Expand all topics
      setExpandedTopics(new Set(topics.map(t => t.id)))
      setIsAllExpanded(true)
    }
  }, [isAllExpanded, subjects, topics])

  // Empty state
  if (subjects.length === 0 && topics.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4rem 2rem',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            fontSize: '3rem',
            marginBottom: '1rem'
          }}
        >
          🗺️
        </div>
        <h3 className="h4" style={{ marginBottom: '0.5rem' }}>
          No topics yet
        </h3>
        <p className="body text-secondary">
          Create subjects and topics to see your learning mindmap
        </p>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ backgroundColor: isFullscreen ? 'var(--color-background)' : undefined }}>
      <MindmapCanvas
        data={mindmapData}
        dimensions={dimensions}
        expandedSubjects={expandedSubjects}
        expandedTopics={expandedTopics}
        onToggleSubject={handleToggleSubject}
        onToggleTopic={handleToggleTopic}
        isAllExpanded={isAllExpanded}
        onToggleExpandAll={handleToggleExpandAll}
        forcePositions={forcePositions}
        onStartDrag={startDrag}
        onDrag={drag}
        onEndDrag={endDrag}
        isSimulating={isSimulating}
        showItemLabels={showItemLabels}
        onToggleLabels={() => setShowItemLabels(prev => !prev)}
        nodeScale={nodeScale}
        onNodeScaleChange={setNodeScale}
        lineScale={lineScale}
        onLineScaleChange={setLineScale}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        layoutMode={layoutMode}
        onLayoutModeChange={setLayoutMode}
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        isFullscreenSupported={isFullscreenSupported}
        hasFilteredResults={filteredTopics.length > 0 || filterMode === 'all'}
        totalTopicsCount={topics.length}
      />
      {!isFullscreen && <MindmapLegend />}
    </div>
  )
}
