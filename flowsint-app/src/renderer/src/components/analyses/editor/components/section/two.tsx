import * as React from 'react'
import type { Editor } from '@tiptap/react'
import type { FormatAction } from '../../types'
import type { toggleVariants } from '@/components/ui/toggle'
import type { VariantProps } from 'class-variance-authority'
import { Code, MoreHorizontal, Bold, Italic, Strikethrough, Type, Underline } from 'lucide-react'
import { ToolbarSection } from '../toolbar-section'

type TextStyleAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'code'
  | 'clearFormatting'

interface TextStyle extends FormatAction {
  value: TextStyleAction
}

const formatActions: TextStyle[] = [
  {
    value: 'bold',
    label: 'Bold',
    icon: <Bold className="size-5" />,
    action: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive('bold'),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleBold().run() && !editor.isActive('codeBlock'),
    shortcuts: ['mod', 'B']
  },
  {
    value: 'italic',
    label: 'Italic',
    icon: <Italic className="size-5" />,
    action: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive('italic'),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleItalic().run() && !editor.isActive('codeBlock'),
    shortcuts: ['mod', 'I']
  },
  {
    value: 'underline',
    label: 'Underline',
    icon: <Underline className="size-5" />,
    action: (editor) => editor.chain().focus().toggleUnderline().run(),
    isActive: (editor) => editor.isActive('underline'),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleUnderline().run() && !editor.isActive('codeBlock'),
    shortcuts: ['mod', 'U']
  },
  {
    value: 'strikethrough',
    label: 'Strikethrough',
    icon: <Strikethrough className="size-5" />,
    action: (editor) => editor.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor.isActive('strike'),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleStrike().run() && !editor.isActive('codeBlock'),
    shortcuts: ['mod', 'shift', 'S']
  },
  {
    value: 'code',
    label: 'Code',
    icon: <Code className="size-5" />,
    action: (editor) => editor.chain().focus().toggleCode().run(),
    isActive: (editor) => editor.isActive('code'),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleCode().run() && !editor.isActive('codeBlock'),
    shortcuts: ['mod', 'E']
  },
  {
    value: 'clearFormatting',
    label: 'Clear formatting',
    icon: <Type className="size-5" />,
    action: (editor) => editor.chain().focus().unsetAllMarks().run(),
    isActive: () => false,
    canExecute: (editor) =>
      editor.can().chain().focus().unsetAllMarks().run() && !editor.isActive('codeBlock'),
    shortcuts: ['mod', '\\']
  }
]

interface SectionTwoProps extends VariantProps<typeof toggleVariants> {
  editor: Editor
  activeActions?: TextStyleAction[]
  mainActionCount?: number
}

export const SectionTwo: React.FC<SectionTwoProps> = ({
  editor,
  activeActions = formatActions.map((action) => action.value),
  mainActionCount = 2,
  size,
  variant
}) => {
  return (
    <ToolbarSection
      editor={editor}
      actions={formatActions}
      activeActions={activeActions}
      mainActionCount={mainActionCount}
      dropdownIcon={<MoreHorizontal className="size-5" />}
      dropdownTooltip="More formatting"
      dropdownClassName="w-8"
      size={size}
      variant={variant}
    />
  )
}

SectionTwo.displayName = 'SectionTwo'

export default SectionTwo
