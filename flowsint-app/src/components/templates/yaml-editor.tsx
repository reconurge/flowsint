import { useRef, useCallback, useEffect, useState } from 'react'
import MonacoEditor, { OnMount, OnChange } from '@monaco-editor/react'
import type { editor, Uri } from 'monaco-editor'
import { useTheme } from '@/components/theme-provider'

interface YamlEditorProps {
  value: string
  onChange: (value: string) => void
  onValidate?: (errors: editor.IMarkerData[]) => void
  readOnly?: boolean
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

export function YamlEditor({ value, onChange, onValidate, readOnly = false }: YamlEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const resolvedTheme = useResolvedTheme()

  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor

      // Configure YAML diagnostics
      monaco.languages.yaml?.yamlDefaults?.setDiagnosticsOptions({
        validate: true,
        enableSchemaRequest: false,
        format: true
      })

      // Listen for marker changes (validation errors)
      monaco.editor.onDidChangeMarkers((uris: readonly Uri[]) => {
        const resource = uris[0]
        if (resource && editor.getModel()?.uri.toString() === resource.toString()) {
          const markers = monaco.editor.getModelMarkers({ resource })
          onValidate?.(markers)
        }
      })

      // Set initial markers check
      setTimeout(() => {
        const model = editor.getModel()
        if (model) {
          const markers = monaco.editor.getModelMarkers({ resource: model.uri })
          onValidate?.(markers)
        }
      }, 500)
    },
    [onValidate]
  )

  const handleChange: OnChange = useCallback(
    (value) => {
      onChange(value || '')
    },
    [onChange]
  )

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0">
        <MonacoEditor
          width="100%"
          height="100%"
          language="yaml"
          theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
          value={value}
          onChange={handleChange}
          onMount={handleEditorMount}
          options={{
            readOnly,
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'on',
            folding: true,
            renderLineHighlight: 'line',
            selectOnLineNumbers: true,
            roundedSelection: true,
            cursorStyle: 'line',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            contextmenu: true,
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            padding: { top: 16, bottom: 16 }
          }}
          loading={
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Loading editor...
            </div>
          }
        />
      </div>
    </div>
  )
}
