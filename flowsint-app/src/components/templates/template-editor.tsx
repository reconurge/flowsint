import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { toast } from 'sonner'
import {
  Copy,
  Check,
  AlertCircle,
  Trash2,
  ChevronRight,
  Play,
  FileCode2,
  FlaskConical,
  Loader2,
  CheckCircle2,
  XCircle,
  Keyboard,
  Sparkles,
  Save
} from 'lucide-react'
import type { editor } from 'monaco-editor'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { useConfirm } from '@/components/use-confirm-dialog'

import { YamlEditor } from './yaml-editor'
import { JsonViewer } from './json-viewer'
import { AIChatPanel, type AIChatPanelHandle } from './ai-chat-panel'
import { defaultTemplate, templateSchema, type TemplateData } from './template-schema'
import { templateService } from '@/api/template-service'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TemplateEditorProps {
  templateId?: string
  initialContent?: TemplateData
  importedYaml?: string
}

interface TestResult {
  success: boolean
  data?: unknown
  error?: string
  duration?: number
  url?: string
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TemplateEditor({ templateId, initialContent, importedYaml }: TemplateEditorProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { confirm } = useConfirm()

  const isEditMode = !!templateId

  const initialYaml = useMemo(
    () => importedYaml ?? (initialContent ? stringifyYaml(initialContent) : defaultTemplate),
    [initialContent, importedYaml]
  )

  // ── Editor state ──────────────────────────────────────────────────────────
  const [content, setContent] = useState(initialYaml)
  const [savedContent, setSavedContent] = useState(initialYaml)
  const [copied, setCopied] = useState(false)
  const [editorErrors, setEditorErrors] = useState<editor.IMarkerData[]>([])
  const [validationResult, setValidationResult] = useState(() => validateTemplate(initialYaml))
  const [activeTab, setActiveTab] = useState<'editor' | 'test'>('editor')

  // ── Test state ────────────────────────────────────────────────────────────
  const [testInput, setTestInput] = useState('')
  const [testParams, setTestParams] = useState<Record<string, string>>({})
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const chatRef = useRef<AIChatPanelHandle>(null)
  const contentBeingSavedRef = useRef<string | null>(null)

  // ── Derived state ─────────────────────────────────────────────────────────
  const hasChanges = content !== savedContent
  const hasErrors = !validationResult.valid || editorErrors.some((e) => e.severity >= 8)
  const templateName = validationResult.data?.name || 'Untitled'
  const templateParams = validationResult.data?.request?.params || {}
  const paramKeys = Object.keys(templateParams)

  const stateRef = useRef({ hasErrors, hasChanges, data: validationResult.data, content })
  stateRef.current = { hasErrors, hasChanges, data: validationResult.data, content }

  // ── Mutations ─────────────────────────────────────────────────────────────

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

  // ── Handlers ──────────────────────────────────────────────────────────────

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
        error: response.error,
        duration: response.duration_ms,
        url: response.url
      })
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

  const buildPreviewUrl = () => {
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
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

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

  // ── Derived ───────────────────────────────────────────────────────────────

  const totalErrors =
    validationResult.errors.length + editorErrors.filter((e) => e.severity >= 8).length

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col overflow-hidden bg-background">
        {/* ── Header ──────────────────────────────────────────────── */}
        <header className="shrink-0 flex items-center justify-between px-4 py-2 border-b bg-card/30">
          {/* Left: Breadcrumb + Status */}
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => navigate({ to: '/dashboard/enrichers' })}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Templates
            </button>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
            <span className="font-medium">{isEditMode ? templateName : 'New Template'}</span>

            {isEditMode ? (
              hasChanges ? (
                <Badge
                  variant="outline"
                  className="ml-1 text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20"
                >
                  Unsaved
                </Badge>
              ) : (
                !hasErrors && (
                  <Badge
                    variant="outline"
                    className="ml-1 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  >
                    <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                    Saved
                  </Badge>
                )
              )
            ) : (
              <Badge
                variant="outline"
                className="ml-1 text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20"
              >
                Draft
              </Badge>
            )}
          </div>

          {/* Right: Toolbar */}
          <div className="flex items-center gap-1">
            {/* Validate (popover with errors) */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 gap-1.5 text-xs ${hasErrors ? 'text-destructive hover:text-destructive' : 'text-emerald-500 hover:text-emerald-500'}`}
                >
                  {hasErrors ? (
                    <>
                      <XCircle className="h-3.5 w-3.5" />
                      {totalErrors} error{totalErrors !== 1 ? 's' : ''}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Valid
                    </>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="p-3 border-b">
                  <p className="text-sm font-medium">
                    {hasErrors ? 'Validation Errors' : 'Validation Passed'}
                  </p>
                </div>
                {hasErrors ? (
                  <div className="p-3 space-y-2 max-h-[200px] overflow-y-auto">
                    {validationResult.errors.map((error, i) => (
                      <div key={i} className="flex gap-2 text-xs">
                        <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                        <span className="text-destructive">{error}</span>
                      </div>
                    ))}
                    {editorErrors
                      .filter((e) => e.severity >= 8)
                      .map((error, i) => (
                        <div key={`e-${i}`} className="flex gap-2 text-xs">
                          <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                          <span className="text-destructive">
                            Line {error.startLineNumber}: {error.message}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="p-3">
                    <p className="text-xs text-muted-foreground">
                      All required fields are present and valid.
                    </p>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <div className="w-px h-4 bg-border mx-0.5" />

            {/* Generate */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setActiveTab('editor')
                    setTimeout(() => chatRef.current?.focusInput(), 50)
                  }}
                  className="h-7 gap-1.5 text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate
                </Button>
              </TooltipTrigger>
              <TooltipContent>Focus AI assistant</TooltipContent>
            </Tooltip>

            <div className="w-px h-4 bg-border mx-0.5" />

            {/* Copy */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 w-7 p-0">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy YAML</TooltipContent>
            </Tooltip>

            {/* Save */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={(isEditMode && !hasChanges) || hasErrors || isSaving}
                  className="h-7 gap-1.5 text-xs"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save Enricher
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <span className="flex items-center gap-1.5">
                  <Keyboard className="h-3 w-3" /> ⌘S
                </span>
              </TooltipContent>
            </Tooltip>

            {/* Delete */}
            {isEditMode && (
              <>
                <div className="w-px h-4 bg-border mx-0.5" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete template</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </header>

        {/* ── Tab Bar ─────────────────────────────────────────────── */}
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

        {/* ── Tab Content ─────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {/* ── Editor Tab ───────────────────────────────────────── */}
          {activeTab === 'editor' && (
            <div className="h-full">
              <ResizablePanelGroup direction="horizontal">
                {/* Left: Code Editor */}
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

                {/* Resize Handle */}
                <ResizableHandle className="hover:bg-primary/20 active:bg-primary/30 transition-colors data-[resize-handle-state=drag]:bg-primary/30" />

                {/* Right: AI Chat */}
                <ResizablePanel defaultSize={40} minSize={25}>
                  <AIChatPanel
                    ref={chatRef}
                    onApplyYaml={handleApplyYaml}
                    currentYaml={content}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          )}

          {/* ── Test Tab ─────────────────────────────────────────── */}
          {activeTab === 'test' && (
            <div className="h-full flex overflow-hidden">
              {/* Test Input */}
              <div className="w-80 shrink-0 border-r p-6 flex flex-col gap-6 overflow-y-auto">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Test your template</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter a test value to simulate the enricher request.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="test-input">
                      Input Value
                      {validationResult.data?.input?.key && (
                        <span className="text-muted-foreground ml-1">
                          ({validationResult.data.input.key})
                        </span>
                      )}
                    </Label>
                    <Input
                      id="test-input"
                      placeholder={`Enter ${validationResult.data?.input?.type || 'value'}...`}
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTest()}
                    />
                  </div>

                  {paramKeys.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Query Parameters</Label>
                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50 border-b">
                              <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground w-1/3">
                                Key
                              </th>
                              <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">
                                Value
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {paramKeys.map((paramKey, idx) => {
                              const defaultValue = templateParams[paramKey] ?? ''
                              return (
                                <tr
                                  key={paramKey}
                                  className={idx < paramKeys.length - 1 ? 'border-b' : ''}
                                >
                                  <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">
                                    {paramKey}
                                  </td>
                                  <td className="px-1 py-1">
                                    <Input
                                      placeholder={String(defaultValue) || 'Value'}
                                      value={testParams[paramKey] ?? ''}
                                      onChange={(e) =>
                                        setTestParams((prev) => ({
                                          ...prev,
                                          [paramKey]: e.target.value
                                        }))
                                      }
                                      className="h-7 text-xs border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-offset-0"
                                    />
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {validationResult.data?.request?.url && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Request URL</Label>
                      <code className="block text-xs bg-muted p-2 rounded break-all">
                        {buildPreviewUrl()}
                      </code>
                    </div>
                  )}

                  <Button
                    onClick={handleTest}
                    disabled={isTesting || hasErrors || !testInput.trim()}
                    className="w-full gap-2"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Run test
                      </>
                    )}
                  </Button>
                </div>

                {hasErrors && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">
                      Fix validation errors before testing.
                    </p>
                  </div>
                )}
              </div>

              {/* Test Result */}
              <div className="flex-1 min-w-0 p-6 bg-muted/20 overflow-y-auto">
                <div className="h-full flex flex-col">
                  <div className="shrink-0 flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Response</h3>
                    {testResult?.duration !== undefined && testResult.duration > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {testResult.duration}ms
                      </Badge>
                    )}
                  </div>

                  {!testResult ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="text-sm">Run a test to see the response here.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0 flex flex-col gap-4">
                      <div
                        className={`shrink-0 p-3 rounded-lg border ${
                          testResult.success
                            ? 'bg-emerald-500/10 border-emerald-500/20'
                            : 'bg-destructive/10 border-destructive/20'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {testResult.success ? (
                            <>
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              <span className="font-medium text-emerald-600">
                                Request Successful
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-5 w-5 text-destructive" />
                              <span className="font-medium text-destructive">Request Failed</span>
                            </>
                          )}
                        </div>
                        {testResult.error && (
                          <p className="text-sm text-destructive mt-1">{testResult.error}</p>
                        )}
                      </div>
                      {testResult.data != null && (
                        <div className="flex-1 min-h-0 flex flex-col">
                          <Label className="shrink-0 mb-2 block">Response Data</Label>
                          <div className="flex-1 min-h-[200px] rounded-md border overflow-hidden">
                            <JsonViewer data={testResult.data} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
