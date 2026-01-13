import { computePosition, flip, shift } from '@floating-ui/dom'
import { posToDOMRect, ReactRenderer } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import TiptapMention from '@tiptap/extension-mention'
import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion'
import { mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { NodeViewWrapper } from '@tiptap/react'
import MentionList from './mention-list'
import type { MentionListRef, MentionItem } from './mention-list'
import { memo, useCallback } from 'react'
import { useIcon } from '@/hooks/use-icon'
import { useNodesDisplaySettings, type ItemType } from '@/stores/node-display-settings'
import { Button } from '@/components/ui/button'
import { GRAPH_COLORS } from '@/components/sketches/graph'
import { useGraphStore } from '@/stores/graph-store'
import { useGraphControls } from '@/stores/graph-controls-store'

function hexWithOpacity(hex: string, opacity: number) {
  hex = hex.replace('#', '')

  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('')
  }

  const alpha = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()

  return `#${hex}${alpha}`
}

const getMentionItemsFromNodes = (): MentionItem[] => {
  const nodes = useGraphStore.getState().nodes
  return nodes
    .map((node) => {
      const label = node.data?.label || node.data?.username || node.id
      const type = node.data?.type as ItemType
      const nodeId = node.data?.id || node.id

      if (!type) return null

      return {
        value: label,
        type: type,
        nodeId: nodeId
      }
    })
    .filter((item): item is MentionItem => item !== null)
}

const updatePosition = (editor: Editor, element: HTMLElement) => {
  const virtualElement = {
    getBoundingClientRect: () =>
      posToDOMRect(editor.view, editor.state.selection.from, editor.state.selection.to)
  }

  computePosition(virtualElement, element, {
    placement: 'bottom-start',
    strategy: 'absolute',
    middleware: [shift(), flip()]
  }).then(({ x, y, strategy }) => {
    element.style.width = 'max-content'
    element.style.position = strategy
    element.style.left = `${x}px`
    element.style.top = `${y}px`
  })
}

// Composant React custom pour le rendu de la mention
const MentionComponent = memo((props: any) => {
  const nodeId = props.node.attrs.nodeId
  const type = props.node.attrs.type as ItemType | null
  const Icon = type ? (useIcon(type, null) ?? null) : null
  const colors = useNodesDisplaySettings((s) => s.colors)
  const color = type ? (colors[type] ?? GRAPH_COLORS.NODE_DEFAULT) : GRAPH_COLORS.NODE_DEFAULT
  const centerOnNode = useGraphControls((state) => state.centerOnNode)
  const setCurrentNodeFromId = useGraphStore((state) => state.setCurrentNodeFromId)

  const handleClick = useCallback(() => {
    const node = setCurrentNodeFromId(nodeId)
    if (node) {
      const { x, y } = node
      // Auto-zoom if enabled and node has coordinates
      if (x !== undefined && y !== undefined) {
        setTimeout(() => {
          centerOnNode(x, y)
        }, 200)
      }
    }
  }, [nodeId, centerOnNode])

  return (
    <NodeViewWrapper
      style={{ display: 'inline-flex', justifyItems: 'center', padding: 0, margin: 0 }}
    >
      <Button
        variant={'ghost'}
        onClick={handleClick}
        className="h-5 px-.5 gap-1 cursor-pointer items-center text-foreground"
        style={{
          backgroundColor: hexWithOpacity(color, 0.2),
          //@ts-ignore
          border: `solid 1px ${hexWithOpacity(color, 0.5)}`
        }}
      >
        {Icon && <Icon size={19} iconOnly className="opacity-60" style={{ color }} />}
        {props.node.attrs.label}
      </Button>
    </NodeViewWrapper>
  )
})

export const Mention = TiptapMention.extend({
  addNodeView() {
    return ReactNodeViewRenderer(MentionComponent)
  },
  addAttributes() {
    return {
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-label'),
        renderHTML: (attributes) => {
          if (!attributes.label) {
            return {}
          }
          return {
            'data-label': attributes.label
          }
        }
      },
      type: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-type'),
        renderHTML: (attributes) => {
          if (!attributes.type) {
            return {}
          }
          return {
            'data-type': attributes.type
          }
        }
      },
      nodeId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-node-id'),
        renderHTML: (attributes) => {
          if (!attributes.nodeId) {
            return {}
          }
          return {
            'data-node-id': attributes.nodeId
          }
        }
      }
    }
  },

  renderHTML({ node, HTMLAttributes }) {
    const children = []
    children.push([
      'span',
      { class: 'mention-label' },
      `${this.options.suggestion.char}${node.attrs.label}`
    ])
    return ['span', mergeAttributes({ class: 'mention' }, HTMLAttributes), ...children]
  }
}).configure({
  deleteTriggerWithBackspace: true,
  suggestion: {
    char: '@',
    items: ({ query }: { query: string }) => {
      const items = getMentionItemsFromNodes()
      return items
        .filter((item) => item.value.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 10)
    },

    render: () => {
      let component: ReactRenderer<MentionListRef> | undefined

      return {
        onStart: (props: SuggestionProps) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor
          })
          if (!props.clientRect) {
            return
          }
          const element = component.element as HTMLElement
          element.style.position = 'absolute'
          element.style.zIndex = '9999'
          document.body.appendChild(element)
          updatePosition(props.editor, element)
        },

        onUpdate(props: SuggestionProps) {
          if (!component) return
          component.updateProps(props)
          if (!props.clientRect) {
            return
          }
          const element = component.element as HTMLElement
          updatePosition(props.editor, element)
        },

        onKeyDown(props: { event: KeyboardEvent }) {
          if (props.event.key === 'Escape') {
            component?.destroy()
            return true
          }

          return component?.ref?.onKeyDown(props) ?? false
        },

        onExit() {
          if (!component) return
          component.element.remove()
          component.destroy()
        }
      }
    }
  } as Partial<SuggestionOptions>
})

export default Mention
