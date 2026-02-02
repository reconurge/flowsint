import { useEffect, useState } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { useTheme } from '@/components/theme-provider'

interface JsonViewerProps {
  data: unknown
  height?: string | number
  className?: string
}

function useResolvedTheme() {
  const { theme } = useTheme()
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setResolvedTheme(isDark ? 'dark' : 'light')
    } else {
      setResolvedTheme(theme as 'dark' | 'light')
    }
  }, [theme])

  return resolvedTheme
}

export function JsonViewer({ data, height = '100%', className }: JsonViewerProps) {
  const resolvedTheme = useResolvedTheme()
  const jsonString = JSON.stringify(data, null, 2)

  return (
    <div className={className} style={{ height }}>
      <MonacoEditor
        width="100%"
        height="100%"
        language="json"
        theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
        value={jsonString}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 12,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          folding: true,
          renderLineHighlight: 'none',
          selectOnLineNumbers: false,
          roundedSelection: true,
          cursorStyle: 'line',
          smoothScrolling: true,
          contextmenu: true,
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          padding: { top: 12, bottom: 12 },
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8
          },
          domReadOnly: true,
          lineDecorationsWidth: 8,
          lineNumbersMinChars: 3
        }}
        loading={
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Loading...
          </div>
        }
      />
    </div>
  )
}
