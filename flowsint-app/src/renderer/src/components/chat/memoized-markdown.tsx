import { marked } from 'marked'
import { memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { cn } from '@/lib/utils'
import { CopyButton } from '../copy'

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown)
  return tokens.map((token) => token.raw)
}

const MemoizedMarkdownBlock = memo(
  ({ content }: { content: string }) => {
    return (
      <ReactMarkdown
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            return match ? (
              <div className="relative">
                <SyntaxHighlighter
                  children={String(children).replace(/\n$/, '')}
                  style={dracula}
                  language={match[1]}
                  PreTag="div"
                  className="rounded border border-border bg-muted px-1 py-0.5 !m-0 text-sm w-auto not-prose"
                  {...props}
                />
                <div className="absolute top-2 right-2">
                  <CopyButton content={String(children).replace(/\n$/, '')} />
                </div>
              </div>
            ) : (
              <code
                className={cn(
                  'rounded border border-border bg-muted text-primary font-normal w-full px-1 py-0.5 text-sm not-prose',
                  className
                )}
                {...props}
              >
                {children}
              </code>
            )
          }
        }}
        remarkPlugins={[remarkGfm]}
      >
        {content}
      </ReactMarkdown>
    )
  },
  (prevProps, nextProps) => {
    if (prevProps.content !== nextProps.content) return false
    return true
  }
)

MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock'

export const MemoizedMarkdown = memo(({ content, id }: { content: string; id: string }) => {
  const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content])

  return (
    <div className="prose max-w-none dark:prose-invert">
      {blocks.map((block, index) => (
        <MemoizedMarkdownBlock content={block} key={`${id}-block_${index}`} />
      ))}
    </div>
  )
})

MemoizedMarkdown.displayName = 'MemoizedMarkdown'
