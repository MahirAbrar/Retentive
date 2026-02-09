/**
 * useForceSimulation Hook
 * Applies d3-force physics simulation to mindmap nodes for spring-like behavior
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceCenter,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum
} from 'd3-force'
import type { MindmapData, MindmapDimensions, MindmapNodeType } from './mindmap.types'

/** Node data for d3-force simulation */
export interface ForceNode extends SimulationNodeDatum {
  id: string
  type: MindmapNodeType
  /** Initial layout x position */
  initialX: number
  /** Initial layout y position */
  initialY: number
  /** Is this node being dragged? */
  fx?: number | null
  fy?: number | null
}

/** Link data for d3-force simulation */
export interface ForceLink extends SimulationLinkDatum<ForceNode> {
  id: string
  source: string | ForceNode
  target: string | ForceNode
}

/** Result from the force simulation hook */
export interface ForceSimulationResult {
  /** Current animated positions for each node */
  positions: Map<string, { x: number; y: number }>
  /** Start dragging a node (fixes its position) */
  startDrag: (nodeId: string) => void
  /** Update drag position */
  drag: (nodeId: string, x: number, y: number) => void
  /** End dragging (releases the node) */
  endDrag: (nodeId: string) => void
  /** Is simulation currently running */
  isSimulating: boolean
  /** Reheat the simulation (useful after expand/collapse) */
  reheat: () => void
}

/** Get node radius based on type */
function getNodeRadius(type: MindmapNodeType): number {
  switch (type) {
    case 'center': return 50
    case 'subject': return 40
    case 'topic': return 28
    case 'item': return 18
    default: return 30
  }
}

/** Get link distance based on node types */
function getLinkDistance(sourceType: MindmapNodeType, targetType: MindmapNodeType): number {
  if (sourceType === 'center' && targetType === 'subject') return 180
  if (sourceType === 'subject' && targetType === 'topic') return 120
  if (sourceType === 'topic' && targetType === 'item') return 80
  return 100
}

/** Get link strength based on node types (lower = more elastic) */
function getLinkStrength(sourceType: MindmapNodeType, _targetType: MindmapNodeType): number {
  if (sourceType === 'center') return 0.6  // Strong pull to center
  if (sourceType === 'subject') return 0.4  // Medium pull to subjects
  if (sourceType === 'topic') return 0.3   // Softer pull to topics
  return 0.3
}

/** Get charge strength (repulsion) based on node type */
function getChargeStrength(type: MindmapNodeType): number {
  switch (type) {
    case 'center': return -400  // Strong repulsion from center
    case 'subject': return -250  // Medium repulsion
    case 'topic': return -150    // Less repulsion
    case 'item': return -80      // Minimal repulsion
    default: return -150
  }
}

export function useForceSimulation(
  mindmapData: MindmapData,
  dimensions: MindmapDimensions,
  enabled: boolean = true,
  nodeScale: number = 1,
  lineScale: number = 1
): ForceSimulationResult {
  const { centerX, centerY } = dimensions
  const simulationRef = useRef<Simulation<ForceNode, ForceLink> | null>(null)
  const nodesMapRef = useRef<Map<string, ForceNode>>(new Map())
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map())
  const [isSimulating, setIsSimulating] = useState(false)
  const tickCountRef = useRef(0)

  // Convert mindmap nodes to force nodes
  const forceNodes: ForceNode[] = mindmapData.nodes.map(node => {
    // Preserve existing position if node already exists
    const existing = nodesMapRef.current.get(node.id)
    return {
      id: node.id,
      type: node.type,
      initialX: node.x,
      initialY: node.y,
      x: existing?.x ?? node.x,
      y: existing?.y ?? node.y,
      vx: existing?.vx ?? 0,
      vy: existing?.vy ?? 0,
      fx: existing?.fx,
      fy: existing?.fy
    }
  })

  // Convert connections to force links
  const forceLinks: ForceLink[] = mindmapData.connections.map(conn => ({
    id: conn.id,
    source: conn.sourceId,
    target: conn.targetId
  }))

  // Create node lookup for link distance/strength calculations
  const nodeTypeMap = new Map<string, MindmapNodeType>()
  forceNodes.forEach(node => nodeTypeMap.set(node.id, node.type))

  // Initialize or update simulation
  useEffect(() => {
    if (!enabled) {
      // If disabled, just use static positions
      const staticPositions = new Map<string, { x: number; y: number }>()
      mindmapData.nodes.forEach(node => {
        staticPositions.set(node.id, { x: node.x, y: node.y })
      })
      setPositions(staticPositions)
      return
    }

    // Update nodes map
    nodesMapRef.current.clear()
    forceNodes.forEach(node => nodesMapRef.current.set(node.id, node))

    // Stop existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop()
    }

    tickCountRef.current = 0

    // Create new simulation
    const simulation = forceSimulation<ForceNode>(forceNodes)
      // Links with custom distance and strength per connection type (scaled by lineScale)
      .force('link', forceLink<ForceNode, ForceLink>(forceLinks)
        .id(d => d.id)
        .distance(link => {
          const sourceNode = typeof link.source === 'object' ? link.source : nodesMapRef.current.get(link.source as string)
          const targetNode = typeof link.target === 'object' ? link.target : nodesMapRef.current.get(link.target as string)
          if (sourceNode && targetNode) {
            return getLinkDistance(sourceNode.type, targetNode.type) * lineScale
          }
          return 100 * lineScale
        })
        .strength(link => {
          const sourceNode = typeof link.source === 'object' ? link.source : nodesMapRef.current.get(link.source as string)
          const targetNode = typeof link.target === 'object' ? link.target : nodesMapRef.current.get(link.target as string)
          if (sourceNode && targetNode) {
            return getLinkStrength(sourceNode.type, targetNode.type)
          }
          return 0.3
        })
      )
      // Repulsion force between all nodes
      .force('charge', forceManyBody<ForceNode>()
        .strength(d => getChargeStrength(d.type))
        .distanceMax(400)
      )
      // Collision detection (scaled by nodeScale)
      .force('collide', forceCollide<ForceNode>()
        .radius(d => getNodeRadius(d.type) * nodeScale + 12)
        .strength(0.8)
        .iterations(2)
      )
      // Keep nodes roughly centered
      .force('center', forceCenter(centerX, centerY).strength(0.05))
      // Gentle pull toward initial positions (prevents drift)
      .force('x', forceX<ForceNode>(d => d.initialX).strength(0.03))
      .force('y', forceY<ForceNode>(d => d.initialY).strength(0.03))
      // Control simulation parameters
      .alphaDecay(0.02)
      .velocityDecay(0.3)

    // Update positions on each tick
    simulation.on('tick', () => {
      tickCountRef.current++
      const newPositions = new Map<string, { x: number; y: number }>()
      simulation.nodes().forEach(node => {
        newPositions.set(node.id, { x: node.x ?? 0, y: node.y ?? 0 })
      })
      setPositions(newPositions)
      setIsSimulating(simulation.alpha() > simulation.alphaMin())
    })

    simulation.on('end', () => {
      setIsSimulating(false)
    })

    simulationRef.current = simulation
    setIsSimulating(true)

    return () => {
      simulation.stop()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mindmapData.nodes.length, mindmapData.connections.length, enabled, centerX, centerY, nodeScale, lineScale])

  // Reheat simulation when nodes/connections change
  useEffect(() => {
    if (simulationRef.current && enabled) {
      simulationRef.current.alpha(0.5).restart()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mindmapData.nodes.map(n => n.id).join(','), enabled])

  // Start dragging a node
  const startDrag = useCallback((nodeId: string) => {
    const node = nodesMapRef.current.get(nodeId)
    if (node && simulationRef.current) {
      // Fix node position
      node.fx = node.x
      node.fy = node.y
      // Reheat simulation for responsive feel
      simulationRef.current.alphaTarget(0.3).restart()
    }
  }, [])

  // Update drag position
  const drag = useCallback((nodeId: string, x: number, y: number) => {
    const node = nodesMapRef.current.get(nodeId)
    if (node) {
      node.fx = x
      node.fy = y
    }
  }, [])

  // End dragging
  const endDrag = useCallback((nodeId: string) => {
    const node = nodesMapRef.current.get(nodeId)
    if (node && simulationRef.current) {
      // Release node (unfix position)
      node.fx = null
      node.fy = null
      // Cool down simulation
      simulationRef.current.alphaTarget(0)
    }
  }, [])

  // Manual reheat
  const reheat = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.alpha(0.5).restart()
    }
  }, [])

  return {
    positions,
    startDrag,
    drag,
    endDrag,
    isSimulating,
    reheat
  }
}
