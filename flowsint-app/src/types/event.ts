import { GraphEdge, GraphNode } from './graph'

export enum EventLevel {
  // Standard log levels
  INFO = 'INFO',
  WARNING = 'WARNING',
  FAILED = 'FAILED',
  SUCCESS = 'SUCCESS',
  DEBUG = 'DEBUG',
  // Enricher-specific statuses
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  GRAPH_APPEND = 'GRAPH_APPEND'
}

export interface Payload {
  message: string
  nodes?: GraphNode[]
  edges?: GraphEdge[]
}

export type Event = {
  id: string
  scan_id: string
  sketch_id: string | null
  type: EventLevel
  payload: Payload
  created_at: string
}
