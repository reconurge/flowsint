import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { toast } from 'sonner'
import {
  FileCode2,
  FlaskConical,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import type { editor } from 'monaco-editor'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { useConfirm } from '@/components/use-confirm-dialog'

import { YamlEditor } from './yaml-editor'
import { AIChatPanel, type AIChatPanelHandle } from './ai-chat-panel'
import { defaultTemplate, templateSchema, type TemplateData } from './template-schema'
import { TemplateEditorHeader } from './template-editor-header'
import { TemplateTestPanel, type TestResult } from './template-test-panel'
import { templateService } from '@/api/template-service'

interface TemplateEditorProps {
  templateId?: string
  initialContent?: TemplateData
  importedYaml?: string
}

function validateTemplate(content: string): {
  valid: boolean
  errors: string[]
  data?: TemplateData
} {
  const errors: string[] = []

  let parsed: TemplateData
  try {
    parsed = parseYaml(content)
  } catch (e) {
    return { valid: false, errors: [`YAML syntax error: ${(e as Error).message}`] }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, errors: ['Template must be a valid YAML object'] }
  }

  const required = templateSchema.required as string[]
  for (const field of required) {
    if (!(field in parsed)) {
      errors.push(`Missing required field: ${field}`)
    }
  }

  if (parsed.input && !parsed.input.type) {
    errors.push('input.type is required')
  }

  if (parsed.request) {
    if (!parsed.request.method) {
      errors.push('request.method is required')
    } else if (!['GET', 'POST'].includes(parsed.request.method)) {
      errors.push('request.method must be GET or POST')
    }
    if (!parsed.request.url) {
      errors.push('request.url is required')
    }
  }

  if (parsed.output && !parsed.output.type) {
    errors.push('output.type is required')
  }

  if (parsed.response) {
    if (!parsed.response.expect) {
      errors.push('response.expect is required')
    } else if (!['json', 'xml', 'text'].includes(parsed.response.expect)) {
      errors.push('response.expect must be json, xml, or text')
    }
  }

  return { valid: errors.length === 0, errors, data: parsed }
}

export function TemplateEditor({ templateId, initialContent, importedYaml }: TemplateEditorProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { confirm } = useConfirm()

  const isEditMode = !!templateId

  const initialYaml = useMemo(
    () => importedYaml ?? (initialContent ? stringifyYaml(initialContent) : defaultTemplate),
    [initialContent, importedYaml]
  )

  const [content, setContent] = useState(initialYaml)
  const [savedContent, setSavedContent] = useState(initialYaml)
  const [copied, setCopied] = useState(false)
  const [editorErrors, setEditorErrors] = useState<editor.IMarkerData[]>([])
  const [validationResult, setValidationResult] = useState(() => validateTemplate(initialYaml))
  const [activeTab, setActiveTab] = useState<'editor' | 'test'>('editor')

  const [testInput, setTestInput] = useState('')
  const [testParams, setTestParams] = useState<Record<string, string>>({})
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  const chatRef = useRef<AIChatPanelHandle>(null)
  const contentBeingSavedRef = useRef<string | null>(null)

  const hasChanges = content !== savedContent
  const hasErrors = !validationResult.valid || editorErrors.some((e) => e.severity >= 8)
  const templateName = validationResult.data?.name || 'Untitled'
  const templateParams = validationResult.data?.request?.params || {}
  const paramKeys = Object.keys(templateParams)

  const stateRef = useRef({ hasErrors, hasChanges, data: validationResult.data, content })
  stateRef.current = { hasErrors, hasChanges, data: validationResult.data, content }

  const createMutation = useMutation({
    mutationFn: (data: TemplateData) =>
      templateService.create({
        name: data.name,
        category: data.category,
        version: data.version,
        content: data
      }),
    onSuccess: (data) => {
      toast.success('Template created successfully')
      queryClient.invalidateQueries({ queryKey: ['template', 'enrichers'] })
      navigate({ to: `/dashboard/enrichers/${data.id}` as string })
    },
    onError: (error) => {
      toast.error(`Failed to create: ${error.message}`)
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: TemplateData) => templateService.update(templateId!, { content: data }),
    onSuccess: () => {
      toast.success('Template saved successfully')
      if (contentBeingSavedRef.current) {
        setSavedContent(contentBeingSavedRef.current)
        contentBeingSavedRef.current = null
      }
      queryClient.invalidateQueries({ queryKey: ['template', 'enrichers'] })
      queryClient.invalidateQueries({ queryKey: ['template', templateId] })
    },
    onError: (error) => {
      contentBeingSavedRef.current = null
      toast.error(`Failed to save: ${error.message}`)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: () => templateService.delete(templateId!),
    onSuccess: () => {
      toast.success('Template deleted')
      queryClient.invalidateQueries({ queryKey: ['template', 'enrichers'] })
      navigate({ to: '/dashboard/enrichers' })
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`)
    }
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  const handleChange = useCallback((value: string) => {
    setContent(value)
    setValidationResult(validateTemplate(value))
  }, [])

  const handleEditorValidate = useCallback((errors: editor.IMarkerData[]) => {
    setEditorErrors(errors)
  }, [])

  const handleSave = useCallback(() => {
    const { hasErrors, hasChanges, data, content } = stateRef.current
    if (hasErrors || !data) {
      toast.error('Please fix validation errors before saving')
      return
    }
    if (isEditMode) {
      if (!hasChanges) return
      contentBeingSavedRef.current = content
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }, [isEditMode, updateMutation, createMutation])

  const handleDelete = useCallback(async () => {
    const confirmed = await confirm({
      title: 'Delete template?',
      message: 'This action cannot be undone. This will permanently delete the template.'
    })
    if (confirmed) {
      deleteMutation.mutate()
    }
  }, [confirm, deleteMutation])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }, [content])

  const handleApplyYaml = useCallback((yaml: string) => {
    setContent(yaml)
    setValidationResult(validateTemplate(yaml))
  }, [])

  const handleTest = useCallback(async () => {
    if (!testInput.trim()) {
      toast.error('Please enter a test value')
      return
    }
    if (!validationResult.data) {
      toast.error('Please fix validation errors before testing')
      return
    }
    setIsTesting(true)
    setTestResult(null)
    try {
      const response = isEditMode
        ? await templateService.test(templateId!, testInput.trim())
        : await templateService.testContent(testInput.trim(), validationResult.data)
      setTestResult({
        success: response.success,
        data: response.data,
        raw_results: response.raw_results,
        error: response.error,
        duration: response.duration_ms,
        url: response.url
      })
      console.log(response)
    } catch (error) {
      setTestResult({
        success: false,
        error: (error as Error).message,
        duration: 0
      })
    } finally {
      setIsTesting(false)
    }
  }, [isEditMode, templateId, testInput, validationResult.data])

  const buildPreviewUrl = useCallback(() => {
    if (!validationResult.data?.request?.url) return ''
    const inputKey = validationResult.data.input?.key || 'value'
    let url = validationResult.data.request.url.replace(
      new RegExp(`\\{\\{${inputKey}\\}\\}`, 'g'),
      testInput || `{${inputKey}}`
    )
    if (paramKeys.length > 0) {
      const paramsObj: Record<string, string> = {}
      for (const key of paramKeys) {
        const templateValue = String(templateParams[key] ?? '')
        const resolvedValue = templateValue.replace(
          new RegExp(`\\{\\{${inputKey}\\}\\}`, 'g'),
          testInput || `{${inputKey}}`
        )
        paramsObj[key] = testParams[key] || resolvedValue
      }
      const searchParams = new URLSearchParams(paramsObj)
      url += (url.includes('?') ? '&' : '?') + searchParams.toString()
    }
    return url
  }, [validationResult.data, testInput, paramKeys, templateParams, testParams])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  const totalErrors =
    validationResult.errors.length + editorErrors.filter((e) => e.severity >= 8).length

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col overflow-hidden bg-background">
        <TemplateEditorHeader
          isEditMode={isEditMode}
          templateName={templateName}
          hasChanges={hasChanges}
          hasErrors={hasErrors}
          totalErrors={totalErrors}
          validationErrors={validationResult.errors}
          editorErrors={editorErrors}
          isSaving={isSaving}
          copied={copied}
          deletePending={deleteMutation.isPending}
          onSave={handleSave}
          onDelete={handleDelete}
          onCopy={handleCopy}
          onGenerateClick={() => {
            setActiveTab('editor')
            setTimeout(() => chatRef.current?.focusInput(), 50)
          }}
          onNavigateBack={() => navigate({ to: '/dashboard/enrichers' })}
        />

        {/* Tab Bar */}
        <div className="shrink-0 border-b bg-card/30">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'editor' | 'test')}
            className="px-4"
          >
            <TabsList className="h-10 bg-transparent p-0 gap-4">
              <TabsTrigger value="editor">
                <FileCode2 className="h-4 w-4 opacity-60" strokeWidth={1.5} />
                Editor
              </TabsTrigger>
              <TabsTrigger value="test">
                <FlaskConical className="h-4 w-4 opacity-60" strokeWidth={1.5} />
                Test
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === 'editor' && (
            <div className="h-full">
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={60} minSize={30}>
                  <div className="h-full flex flex-col overflow-hidden">
                    <div className="flex-1 min-h-0">
                      <YamlEditor
                        value={content}
                        onChange={handleChange}
                        onValidate={handleEditorValidate}
                      />
                    </div>

                    {/* Status Bar */}
                    <div className="shrink-0 flex items-center justify-between px-3 py-1 border-t bg-card/20 text-[11px] text-muted-foreground select-none">
                      <div className="flex items-center gap-3">
                        {hasErrors ? (
                          <span className="flex items-center gap-1 text-destructive">
                            <XCircle className="h-3 w-3" />
                            {totalErrors} error{totalErrors !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-500/80">
                            <CheckCircle2 className="h-3 w-3" />
                            Valid
                          </span>
                        )}
                        {hasChanges && <span className="text-amber-500">Modified</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span>{content.split('\n').length} lines</span>
                        <span>YAML</span>
                      </div>
                    </div>
                  </div>
                </ResizablePanel>
                <ResizableHandle className="hover:bg-primary/20 active:bg-primary/30 transition-colors data-[resize-handle-state=drag]:bg-primary/30" />
                <ResizablePanel defaultSize={40} minSize={25}>
                  <AIChatPanel ref={chatRef} onApplyYaml={handleApplyYaml} currentYaml={content} />
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          )}
          {activeTab === 'test' && (
            <TemplateTestPanel
              testInput={testInput}
              testParams={testParams}
              testResult={testResult}
              isTesting={isTesting}
              hasErrors={hasErrors}
              validationData={validationResult.data}
              paramKeys={paramKeys}
              templateParams={templateParams}
              onTestInputChange={setTestInput}
              onTestParamsChange={setTestParams}
              onRunTest={handleTest}
              buildPreviewUrl={buildPreviewUrl}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
