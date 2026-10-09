import { describe, expect, it, vi } from 'vitest'
import type { GraphNode, NodeShape } from '@/types'
import type { GraphForceSettings } from '@/stores/graph-settings-store'
import { paintNodePointerArea, renderNode } from './node-renderer'
import { createRenderContext } from '../utils/render-context'

const recordingContext = () => {
  let path: unknown[][] = []
  const fills: unknown[][][] = []
  const context = {
    canvas: { width: 800, height: 600 },
    getTransform: () => ({ a: 1, d: 1, e: 0, f: 0 }),
    beginPath: () => {
      path = []
    },
    arc: (...args: unknown[]) => path.push(['arc', ...args]),
    rect: (...args: unknown[]) => path.push(['rect', ...args]),
    moveTo: (...args: unknown[]) => path.push(['moveTo', ...args]),
    lineTo: (...args: unknown[]) => path.push(['lineTo', ...args]),
    closePath: () => path.push(['closePath']),
    roundRect: (...args: unknown[]) => path.push(['roundRect', ...args]),
    fill: () => fills.push([...path]),
    stroke: vi.fn(),
    measureText: () => ({ width: 20 }),
    fillStyle: ''
  }
  return { ctx: context as unknown as CanvasRenderingContext2D, fills }
}

// The pointer map must cover the same body as the visible node, including
// square corners and the enlarged low-zoom shapes used in crowded graphs.
describe('node pointer geometry', () => {
  for (const shape of ['circle', 'square', 'hexagon', 'triangle'] as NodeShape[]) {
    for (const scale of [0.5, 2, 3]) {
      it(`matches the visible ${shape} body at zoom ${scale}`, () => {
        const node = {
          id: 'test',
          x: 100,
          y: 100,
          nodeSize: 15,
          nodeColor: '#123456',
          nodeShape: shape,
          neighbors: ['a', 'b', 'c']
        } as unknown as GraphNode
        const settings = {
          dotStyle: { value: true },
          nodeSize: { value: 80 },
          nodeWeightMultiplierSize: { value: 2 }
        } as GraphForceSettings
        const visible = recordingContext()
        const pointer = recordingContext()
        renderNode({
          node,
          ctx: visible.ctx,
          globalScale: scale,
          forceSettings: settings,
          showLabels: false,
          showIcons: false,
          isCurrent: () => false,
          isSelected: () => false,
          theme: 'dark',
          highlightNodes: new Set(),
          highlightLinks: new Set(),
          hoverNode: null,
          rc: createRenderContext(scale, new Set(), new Set(), [], 'dark')
        })
        paintNodePointerArea(node, '#abcdef', pointer.ctx, settings, scale)
        expect(pointer.fills[0]).toEqual(visible.fills[0])
        expect(pointer.ctx.fillStyle).toBe('#abcdef')
      })
    }
  }
})
