/**
 * Mindmap Types
 * TypeScript interfaces for the mindmap visualization component
 */

export type MindmapNodeType = 'center' | 'subject' | 'topic' | 'item'

export interface MindmapNode {
  id: string
  type: MindmapNodeType
  label: string
  icon?: string
  color: string
  masteryPercentage: number
  children: MindmapNode[]
  x: number
  y: number
  angle: number
  depth: number
  parentId?: string
}

export interface MindmapConnection {
  id: string
  sourceId: string
  targetId: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  masteryPercentage: number
  color: string
}

export interface MindmapData {
  nodes: MindmapNode[]
  connections: MindmapConnection[]
  centerNode: MindmapNode
}

export interface ViewTransform {
  x: number
  y: number
  scale: number
}

export interface MindmapDimensions {
  width: number
  height: number
  centerX: number
  centerY: number
}

export interface SubjectNodeData {
  id: string
  name: string
  icon: string
  color: string
  masteredCount: number
  itemCount: number
  topicCount: number
}

export interface TopicNodeData {
  id: string
  name: string
  subjectId: string | null
  masteredCount: number
  itemCount: number
  items: ItemNodeData[]
}

export interface ItemNodeData {
  id: string
  content: string
  reviewCount: number
  isMastered: boolean
}
