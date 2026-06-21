import { describe, it, expect } from 'vitest'
import { getListOfAllChildrenFromNodes } from './tools'
import { GraphNode } from '@/types'

const makeNode = (id: string, overrides?: Partial<GraphNode>): GraphNode => ({
  id,
  nodeType: 'test',
  nodeLabel: 'Test Node',
  nodeProperties: {},
  nodeSize: 1,
  nodeColor: null,
  nodeIcon: null,
  nodeImage: null,
  nodeFlag: null,
  nodeShape: null,
  nodeMetadata: {},
  x: 0,
  y: 0,
  ...overrides,
})

describe('getListOfAllChildrenFromNodes', () => {
  it('should handle empty array', () => {
    expect(getListOfAllChildrenFromNodes([])).toEqual(undefined)
  })

  it('should handle single node without children', () => {
    expect(getListOfAllChildrenFromNodes([makeNode('node-1')])).toEqual(undefined)
  })

  it('should handle multiple nodes', () => {
    expect(getListOfAllChildrenFromNodes([makeNode('node-1'), makeNode('node-2')])).toEqual(undefined)
  })

  it('should handle nodes with neighbors', () => {
    const nodes = [makeNode('node-1', { neighbors: [{ id: 'node-2' }, { id: 'node-3' }] })]
    expect(getListOfAllChildrenFromNodes(nodes)).toEqual(undefined)
  })

  it('should handle nodes with links', () => {
    const nodes = [makeNode('node-1', { links: [{ target: 'node-2' }, { target: 'node-3' }] })]
    expect(getListOfAllChildrenFromNodes(nodes)).toEqual(undefined)
  })
})
