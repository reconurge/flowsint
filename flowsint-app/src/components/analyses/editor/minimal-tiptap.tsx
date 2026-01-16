import * as React from 'react'
import type { Content, Editor } from '@tiptap/react'
import type { UseMinimalTiptapEditorProps } from './hooks/use-minimal-tiptap'
import { EditorContent } from '@tiptap/react'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { SectionOne } from './components/section/one'
import { SectionTwo } from './components/section/two'
import { SectionThree } from './components/section/three'
import { SectionFour } from './components/section/four'
import { SectionFive } from './components/section/five'
import { LinkBubbleMenu } from './components/bubble-menu/link-bubble-menu'
import { useMinimalTiptapEditor } from './hooks/use-minimal-tiptap'
import { MeasuredContainer } from './components/measured-container'
// import "./styles/index.css"

export interface MinimalTiptapProps extends Omit<UseMinimalTiptapEditorProps, 'onUpdate'> {
  value?: Content
  onChange?: (value: Content) => void
  className?: string
  editorContentClassName?: string
  onEditorReady?: (editor: Editor) => void
  showToolbar?: boolean
}
//@ts-ignore
const Toolbar = ({ editor }: { editor: Editor }) => (
  <div className="shrink-0 h-11 overflow-x-auto border-b border-border px-2 flex items-center">
    <div className="flex w-max items-center gap-px">
      <SectionOne editor={editor} activeLevels={[1, 2, 3, 4, 5, 6]} />
      <Separator orientation="vertical" className="mx-2 h-7" />
      <SectionTwo
        editor={editor}
        activeActions={['bold', 'italic', 'underline', 'strikethrough', 'code', 'clearFormatting']}
        mainActionCount={3}
      />
      <Separator orientation="vertical" className="mx-2 h-7" />
      <SectionThree editor={editor} />
      <Separator orientation="vertical" className="mx-2 h-7" />
      <SectionFour
        editor={editor}
        activeActions={['orderedList', 'bulletList']}
        mainActionCount={0}
      />
      <Separator orientation="vertical" className="mx-2 h-7" />
      <SectionFive
        editor={editor}
        activeActions={['codeBlock', 'blockquote', 'horizontalRule']}
        mainActionCount={0}
      />
    </div>
  </div>
)

export const MinimalTiptapEditor = React.forwardRef<HTMLDivElement, MinimalTiptapProps>(
  (
    {
      value,
      onChange,
      className,
      editorContentClassName,
      onEditorReady,
      showToolbar = false,
      ...props
    },
    ref
  ) => {
    const editor = useMinimalTiptapEditor({
      value,
      onUpdate: onChange,
      shouldRerenderOnTransaction: false,
      ...props
    })

    React.useEffect(() => {
      if (editor && onEditorReady) {
        onEditorReady(editor)
      }
    }, [editor, onEditorReady])

    if (!editor) {
      return null
    }

    return (
      <MeasuredContainer
        as="div"
        name="editor"
        ref={ref}
        className={cn('flex hide-scrollbar w-full flex-col', className)}
      >
        {showToolbar && (
          <div className="sticky top-10 bg-card/90 z-20 backdrop-blur-md">
            <Toolbar editor={editor} />
          </div>
        )}
        <EditorContent
          editor={editor}
          className={cn(
            'minimal-tiptap-editor prose dark:prose-invert p-8 w-full max-w-4xl mx-auto',
            editorContentClassName
          )}
        />
        <LinkBubbleMenu editor={editor} />
      </MeasuredContainer>
    )
  }
)

MinimalTiptapEditor.displayName = 'MinimalTiptapEditor'

export default MinimalTiptapEditor
