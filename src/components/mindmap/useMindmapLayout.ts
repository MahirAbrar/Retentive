/**
 * useMindmapLayout Hook
 * Calculates positions for mindmap nodes with different layout modes
 */

import { useMemo } from 'react'
import type {
  MindmapNode,
  MindmapConnection,
  MindmapData,
  MindmapDimensions,
  SubjectNodeData,
  TopicNodeData
} from './mindmap.types'
import type { LayoutMode } from './MindmapView'

interface LayoutConfig {
  subjectRadius: number
  topicRadius: number
  itemRadius: number
}

const DEFAULT_CONFIG: LayoutConfig = {
  subjectRadius: 180,
  topicRadius: 120,
  itemRadius: 80
}

export function useMindmapLayout(
  subjects: SubjectNodeData[],
  topics: TopicNodeData[],
  expandedSubjects: Set<string>,
  expandedTopics: Set<string>,
  dimensions: MindmapDimensions,
  layoutMode: LayoutMode = 'radial'
): MindmapData {
  return useMemo(() => {
    const { centerX, centerY, width, height } = dimensions
    const nodes: MindmapNode[] = []
    const connections: MindmapConnection[] = []

    // Center node position depends on layout
    const centerNodeX = layoutMode === 'horizontal' ? 80 : layoutMode === 'vertical' ? centerX : centerX
    const centerNodeY = layoutMode === 'vertical' ? 60 : centerY

    // Center node
    const centerNode: MindmapNode = {
      id: 'center',
      type: 'center',
      label: 'My Learning',
      color: 'var(--color-primary)',
      masteryPercentage: calculateOverallMastery(subjects),
      children: [],
      x: centerNodeX,
      y: centerNodeY,
      angle: 0,
      depth: 0
    }
    nodes.push(centerNode)

    // Dynamic radius based on content
    const baseSubjectRadius = DEFAULT_CONFIG.subjectRadius
    const subjectRadius = subjects.length > 6
      ? baseSubjectRadius + (subjects.length - 6) * 15
      : baseSubjectRadius

    // Create subject nodes based on layout mode
    const subjectCount = subjects.length
    const unassignedTopics = topics.filter(t => !t.subjectId)
    const totalSubjects = subjectCount + (unassignedTopics.length > 0 ? 1 : 0)

    // Layout-specific calculations
    const getSubjectPosition = (index: number) => {
      if (layoutMode === 'horizontal') {
        // Horizontal tree: subjects spread vertically on the right of center
        const spacing = Math.min(80, (height - 100) / Math.max(totalSubjects, 1))
        const startY = centerNodeY - ((totalSubjects - 1) * spacing) / 2
        return {
          x: centerNodeX + 150,
          y: startY + index * spacing,
          angle: 0
        }
      } else if (layoutMode === 'vertical') {
        // Vertical tree: subjects spread horizontally below center
        const spacing = Math.min(120, (width - 100) / Math.max(totalSubjects, 1))
        const startX = centerNodeX - ((totalSubjects - 1) * spacing) / 2
        return {
          x: startX + index * spacing,
          y: centerNodeY + 120,
          angle: Math.PI / 2
        }
      } else {
        // Radial layout (default)
        const angleStep = totalSubjects > 0 ? (2 * Math.PI) / totalSubjects : 0
        const startAngle = -Math.PI / 2
        const angle = startAngle + index * angleStep
        return {
          x: centerX + subjectRadius * Math.cos(angle),
          y: centerY + subjectRadius * Math.sin(angle),
          angle
        }
      }
    }

    subjects.forEach((subject, index) => {
      const pos = getSubjectPosition(index)
      const { x, y, angle } = pos

      const subjectMastery = subject.itemCount > 0
        ? subject.masteredCount / subject.itemCount
        : 0

      const subjectNode: MindmapNode = {
        id: subject.id,
        type: 'subject',
        label: subject.name,
        icon: subject.icon,
        color: subject.color,
        masteryPercentage: subjectMastery,
        children: [],
        x,
        y,
        angle,
        depth: 1,
        parentId: 'center'
      }
      nodes.push(subjectNode)
      centerNode.children.push(subjectNode)

      // Connection from center to subject
      connections.push({
        id: `center-${subject.id}`,
        sourceId: 'center',
        targetId: subject.id,
        sourceX: centerNodeX,
        sourceY: centerNodeY,
        targetX: x,
        targetY: y,
        masteryPercentage: subjectMastery,
        color: subject.color
      })

      // If subject is expanded, add topic nodes
      if (expandedSubjects.has(subject.id)) {
        const subjectTopics = topics.filter(t => t.subjectId === subject.id)
        addTopicNodes(
          subjectTopics,
          subjectNode,
          subject.color,
          x,
          y,
          angle,
          nodes,
          connections,
          expandedTopics
        )
      }
    })

    // Handle unassigned topics
    if (unassignedTopics.length > 0) {
      const unassignedPos = getSubjectPosition(subjectCount)
      const { x: unassignedX, y: unassignedY, angle: unassignedAngle } = unassignedPos

      const unassignedMastery = unassignedTopics.reduce((sum, t) => {
        return sum + (t.itemCount > 0 ? t.masteredCount / t.itemCount : 0)
      }, 0) / unassignedTopics.length

      const unassignedNode: MindmapNode = {
        id: 'unassigned',
        type: 'subject',
        label: 'Unassigned',
        icon: '📁',
        color: 'var(--color-gray-400)',
        masteryPercentage: unassignedMastery || 0,
        children: [],
        x: unassignedX,
        y: unassignedY,
        angle: unassignedAngle,
        depth: 1,
        parentId: 'center'
      }
      nodes.push(unassignedNode)
      centerNode.children.push(unassignedNode)

      connections.push({
        id: 'center-unassigned',
        sourceId: 'center',
        targetId: 'unassigned',
        sourceX: centerNodeX,
        sourceY: centerNodeY,
        targetX: unassignedX,
        targetY: unassignedY,
        masteryPercentage: unassignedMastery || 0,
        color: 'var(--color-gray-400)'
      })

      if (expandedSubjects.has('unassigned')) {
        addTopicNodes(
          unassignedTopics,
          unassignedNode,
          'var(--color-gray-400)',
          unassignedX,
          unassignedY,
          unassignedAngle,
          nodes,
          connections,
          expandedTopics
        )
      }
    }

    return { nodes, connections, centerNode }
  }, [subjects, topics, expandedSubjects, expandedTopics, dimensions, layoutMode])
}

function addTopicNodes(
  topicsList: TopicNodeData[],
  parentNode: MindmapNode,
  color: string,
  parentX: number,
  parentY: number,
  parentAngle: number,
  nodes: MindmapNode[],
  connections: MindmapConnection[],
  expandedTopics: Set<string>
) {
  const topicCount = topicsList.length
  if (topicCount === 0) return

  const topicRadius = DEFAULT_CONFIG.topicRadius + Math.max(0, topicCount - 5) * 10
  const arcSpread = Math.min(Math.PI * 0.8, Math.PI * (topicCount / 8))
  const topicAngleStep = topicCount > 1 ? arcSpread / (topicCount - 1) : 0
  const arcStartAngle = parentAngle - arcSpread / 2

  topicsList.forEach((topic, topicIndex) => {
    const topicAngle = topicCount > 1
      ? arcStartAngle + topicIndex * topicAngleStep
      : parentAngle
    const topicX = parentX + topicRadius * Math.cos(topicAngle)
    const topicY = parentY + topicRadius * Math.sin(topicAngle)

    const topicMastery = topic.itemCount > 0
      ? topic.masteredCount / topic.itemCount
      : 0

    const topicNode: MindmapNode = {
      id: topic.id,
      type: 'topic',
      label: topic.name,
      color,
      masteryPercentage: topicMastery,
      children: [],
      x: topicX,
      y: topicY,
      angle: topicAngle,
      depth: 2,
      parentId: parentNode.id
    }
    nodes.push(topicNode)
    parentNode.children.push(topicNode)

    connections.push({
      id: `${parentNode.id}-${topic.id}`,
      sourceId: parentNode.id,
      targetId: topic.id,
      sourceX: parentX,
      sourceY: parentY,
      targetX: topicX,
      targetY: topicY,
      masteryPercentage: topicMastery,
      color
    })

    // If topic is expanded, add item nodes
    if (expandedTopics.has(topic.id) && topic.items && topic.items.length > 0) {
      addItemNodes(
        topic.items,
        topicNode,
        color,
        topicX,
        topicY,
        topicAngle,
        nodes,
        connections
      )
    }
  })
}

function addItemNodes(
  items: TopicNodeData['items'],
  parentNode: MindmapNode,
  color: string,
  parentX: number,
  parentY: number,
  parentAngle: number,
  nodes: MindmapNode[],
  connections: MindmapConnection[]
) {
  const itemCount = items.length
  if (itemCount === 0) return

  // Limit displayed items to prevent overcrowding
  const maxItems = 8
  const displayItems = items.slice(0, maxItems)
  const hasMore = items.length > maxItems

  const itemRadius = DEFAULT_CONFIG.itemRadius + Math.max(0, displayItems.length - 4) * 8
  const arcSpread = Math.min(Math.PI * 0.7, Math.PI * (displayItems.length / 6))
  const itemAngleStep = displayItems.length > 1 ? arcSpread / (displayItems.length - 1) : 0
  const arcStartAngle = parentAngle - arcSpread / 2

  displayItems.forEach((item, itemIndex) => {
    const itemAngle = displayItems.length > 1
      ? arcStartAngle + itemIndex * itemAngleStep
      : parentAngle
    const itemX = parentX + itemRadius * Math.cos(itemAngle)
    const itemY = parentY + itemRadius * Math.sin(itemAngle)

    const itemMastery = item.isMastered ? 1 : item.reviewCount >= 5 ? 1 : item.reviewCount / 5

    // Truncate content for label
    const label = item.content.length > 20
      ? item.content.substring(0, 18) + '...'
      : item.content

    const itemNode: MindmapNode = {
      id: item.id,
      type: 'item',
      label,
      color,
      masteryPercentage: itemMastery,
      children: [],
      x: itemX,
      y: itemY,
      angle: itemAngle,
      depth: 3,
      parentId: parentNode.id
    }
    nodes.push(itemNode)
    parentNode.children.push(itemNode)

    connections.push({
      id: `${parentNode.id}-${item.id}`,
      sourceId: parentNode.id,
      targetId: item.id,
      sourceX: parentX,
      sourceY: parentY,
      targetX: itemX,
      targetY: itemY,
      masteryPercentage: itemMastery,
      color
    })
  })

  // Add "more" indicator if there are hidden items
  if (hasMore) {
    const moreAngle = arcStartAngle + displayItems.length * itemAngleStep
    const moreX = parentX + itemRadius * Math.cos(moreAngle)
    const moreY = parentY + itemRadius * Math.sin(moreAngle)

    const moreNode: MindmapNode = {
      id: `${parentNode.id}-more`,
      type: 'item',
      label: `+${items.length - maxItems} more`,
      color,
      masteryPercentage: 0,
      children: [],
      x: moreX,
      y: moreY,
      angle: moreAngle,
      depth: 3,
      parentId: parentNode.id
    }
    nodes.push(moreNode)

    connections.push({
      id: `${parentNode.id}-more`,
      sourceId: parentNode.id,
      targetId: `${parentNode.id}-more`,
      sourceX: parentX,
      sourceY: parentY,
      targetX: moreX,
      targetY: moreY,
      masteryPercentage: 0,
      color
    })
  }
}

function calculateOverallMastery(subjects: SubjectNodeData[]): number {
  const totalItems = subjects.reduce((sum, s) => sum + s.itemCount, 0)
  const totalMastered = subjects.reduce((sum, s) => sum + s.masteredCount, 0)
  return totalItems > 0 ? totalMastered / totalItems : 0
}
