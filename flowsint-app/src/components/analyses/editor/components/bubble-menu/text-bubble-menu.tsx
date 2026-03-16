import * as React from 'react'
import type { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Link as LinkIcon,
  Highlighter,
  ChevronDown
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { LinkEditBlock } from '../link/link-edit-block'
import { cn } from '@/lib/utils'

interface TextBubbleMenuProps {
  editor: Editor
}

const prevent = (e: React.MouseEvent) => e.preventDefault()

const BubbleButton = ({
  active,
  onClick,
  disabled,
  children,
}: {
  active?: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) => (
  <button
    type="button"
    className={cn(
      'flex h-7 w-7 items-center justify-center rounded-sm text-sm transition-colors',
      'hover:bg-accent hover:text-accent-foreground',
      active && 'bg-accent text-accent-foreground',
      disabled && 'pointer-events-none opacity-50'
    )}
    onMouseDown={prevent}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
)

export const TextBubbleMenu: React.FC<TextBubbleMenuProps> = ({ editor }) => {
  const [showLinkEditor, setShowLinkEditor] = React.useState(false)

  const shouldShow = React.useCallback(
    ({ editor: ed, from, to }: { editor: Editor; from: number; to: number }) => {
      if (from === to) return false
      if (!ed.isEditable) return false
      if (ed.isActive('codeBlock')) return false
      if (ed.isActive('link')) return false
      return true
    },
    []
  )

  const handleSetLink = React.useCallback(
    (url: string, text?: string, openInNewTab?: boolean) => {
      if (text) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'text',
            text,
            marks: [
              {
                type: 'link',
                attrs: { href: url, target: openInNewTab ? '_blank' : '' }
              }
            ]
          })
          .run()
      } else {
        editor
          .chain()
          .focus()
          .setLink({ href: url, target: openInNewTab ? '_blank' : '' })
          .run()
      }
      setShowLinkEditor(false)
    },
    [editor]
  )

  const activeHeading = editor.isActive('heading', { level: 1 })
    ? 'H1'
    : editor.isActive('heading', { level: 2 })
      ? 'H2'
      : editor.isActive('heading', { level: 3 })
        ? 'H3'
        : 'P'

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="textBubbleMenu"
      shouldShow={shouldShow}
      options={{
        placement: 'top',
        offset: 8
      }}
    >
      <div
        className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-md"
        onMouseDown={prevent}
      >
        <BubbleButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </BubbleButton>
        <BubbleButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </BubbleButton>
        <BubbleButton
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={!editor.can().chain().focus().toggleUnderline().run()}
        >
          <Underline className="size-4" />
        </BubbleButton>
        <BubbleButton
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-4" />
        </BubbleButton>
        <BubbleButton
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={!editor.can().chain().focus().toggleCode().run()}
        >
          <Code className="size-4" />
        </BubbleButton>

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        {/* Heading dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-7 items-center gap-0.5 rounded-sm px-2 text-xs font-semibold hover:bg-accent hover:text-accent-foreground"
              onMouseDown={prevent}
            >
              {activeHeading}
              <ChevronDown className="size-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-1" align="start">
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                className="flex items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-accent"
                onMouseDown={prevent}
                onClick={() => editor.chain().focus().setParagraph().run()}
              >
                <Pilcrow className="size-4" />
                Paragraph
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-accent"
                onMouseDown={prevent}
                onClick={() => editor.chain().focus().setHeading({ level: 1 }).run()}
              >
                <Heading1 className="size-4" />
                Heading 1
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-accent"
                onMouseDown={prevent}
                onClick={() => editor.chain().focus().setHeading({ level: 2 }).run()}
              >
                <Heading2 className="size-4" />
                Heading 2
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-accent"
                onMouseDown={prevent}
                onClick={() => editor.chain().focus().setHeading({ level: 3 }).run()}
              >
                <Heading3 className="size-4" />
                Heading 3
              </button>
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        {/* Link */}
        <Popover open={showLinkEditor} onOpenChange={setShowLinkEditor}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-sm hover:bg-accent hover:text-accent-foreground',
                editor.isActive('link') && 'bg-accent text-accent-foreground'
              )}
              onMouseDown={prevent}
            >
              <LinkIcon className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-full min-w-80 p-0" align="start">
            <LinkEditBlock onSave={handleSetLink} className="p-4" />
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        {/* Highlight */}
        <BubbleButton
          active={editor.isActive('highlight')}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter className="size-4" />
        </BubbleButton>
      </div>
    </BubbleMenu>
  )
}
