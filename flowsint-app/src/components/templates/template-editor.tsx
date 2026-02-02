import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { toast } from 'sonner'
import {
  Save,
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
  Info,
  Keyboard
} from 'lucide-react'
import type { editor } from 'monaco-editor'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useConfirm } from '@/components/use-confirm-dialog'

import { YamlEditor } from './yaml-editor'
import { JsonViewer } from './json-viewer'
import { defaultTemplate, templateSchema, type TemplateData } from './template-schema'
import { templateService } from '@/api/template-service'

interface TemplateEditorProps {
  /** Template ID for edit mode. If not provided, component is in create mode. */
  templateId?: string
  /** Initial content for edit mode. Uses defaultTemplate for create mode. */
  initialContent?: TemplateData
  /** Raw YAML string to use as initial content (e.g., from imported file). Takes precedence over initialContent. */
  importedYaml?: string
}

interface TestResult {
  success: boolean
  data?: unknown
  error?: string
  duration?: number
  url?: string
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

  // Test state
  const [testInput, setTestInput] = useState('')
  const [testParams, setTestParams] = useState<Record<string, string>>({})
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  // Get params from template, replacing {{key}} placeholders with empty string for display
  const templateParams = validationResult.data?.request?.params || {}
  const paramKeys = Object.keys(templateParams)

  // Build the full URL with query params for preview
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
        const templateValue = templateParams[key] ?? ''
        // Replace {{key}} in param value with test input
        const resolvedValue = templateValue.replace(
          new RegExp(`\\{\\{${inputKey}\\}\\}`, 'g'),
          testInput || `{${inputKey}}`
        )
        // Use custom test value if provided, otherwise use resolved template value
        paramsObj[key] = testParams[key] || resolvedValue
      }
      const searchParams = new URLSearchParams(paramsObj)
      url += (url.includes('?') ? '&' : '?') + searchParams.toString()
    }

    return url
  }

  const hasChanges = content !== savedContent
  const hasErrors = !validationResult.valid || editorErrors.some((e) => e.severity >= 8)

  // Derive template name from content
  const templateName = validationResult.data?.name || 'Untitled'

  // Ref to always have latest state for keyboard shortcut
  const stateRef = useRef({ hasErrors, hasChanges, data: validationResult.data, content })
  stateRef.current = { hasErrors, hasChanges, data: validationResult.data, content }

  // Ref to track content being saved
  const contentBeingSavedRef = useRef<string | null>(null)

  // Create mutation (for new templates)
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

  // Update mutation (for existing templates)
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

  // Delete mutation (for existing templates)
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

  // Keyboard shortcuts
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
      // Use different API based on mode
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

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b bg-card/50">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => navigate({ to: '/dashboard/enrichers' })}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Templates
            </button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{isEditMode ? templateName : 'New Template'}</span>

            {/* Status Badge */}
            {isEditMode ? (
              hasChanges ? (
                <Badge
                  variant="outline"
                  className="ml-2 text-xs bg-amber-500/10 text-amber-600 border-amber-500/20"
                >
                  Unsaved
                </Badge>
              ) : (
                !hasErrors && (
                  <Badge
                    variant="outline"
                    className="ml-2 text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Saved
                  </Badge>
                )
              )
            ) : (
              <Badge
                variant="outline"
                className="ml-2 text-xs bg-blue-500/10 text-blue-600 border-blue-500/20"
              >
                Draft
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy YAML</TooltipContent>
            </Tooltip>
            <div className="w-px h-6 bg-border" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  disabled={(isEditMode && !hasChanges) || hasErrors || isSaving}
                  className="h-8 gap-1.5"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isEditMode ? 'Save' : 'Create template'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex items-center gap-2">
                  <Keyboard className="h-3 w-3" />
                  <span>⌘S</span>
                </div>
              </TooltipContent>
            </Tooltip>
            {isEditMode && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="h-8 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete template</TooltipContent>
              </Tooltip>
            )}
          </div>
        </header>
        <div className="border-b bg-card/30">
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
        <div className="flex-1 flex overflow-hidden">
          <Tabs value={activeTab} className="flex-1 flex">
            <TabsContent value="editor" className="flex-1 flex m-0 data-[state=inactive]:hidden">
              <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
                <YamlEditor
                  value={content}
                  onChange={handleChange}
                  onValidate={handleEditorValidate}
                />
              </div>
              <div className="w-72 border-l bg-card/30 flex flex-col">
                <div className="p-4 border-b">
                  <div className="flex items-center gap-2">
                    {hasErrors ? (
                      <>
                        <div className="p-1.5 rounded-full bg-destructive/10">
                          <XCircle className="h-4 w-4 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-destructive">Validation failed</p>
                          <p className="text-xs text-muted-foreground">
                            {validationResult.errors.length +
                              editorErrors.filter((e) => e.severity >= 8).length}{' '}
                            error(s)
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-1.5 rounded-full bg-emerald-500/10">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-emerald-600">Valid template</p>
                          <p className="text-xs text-muted-foreground">
                            {isEditMode ? 'Ready to save' : 'Ready to create'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-3">
                    {validationResult.errors.map((error, i) => (
                      <div key={i} className="flex gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <span className="text-destructive">{error}</span>
                      </div>
                    ))}
                    {editorErrors
                      .filter((e) => e.severity >= 8)
                      .map((error, i) => (
                        <div key={`editor-${i}`} className="flex gap-2 text-sm">
                          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          <span className="text-destructive">
                            Line {error.startLineNumber}: {error.message}
                          </span>
                        </div>
                      ))}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Schema reference</span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-2">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">Required:</p>
                        <ul className="list-disc list-inside space-y-0.5 ml-1">
                          <li>name, category, version</li>
                          <li>input.type</li>
                          <li>request.method, request.url</li>
                          <li>output.type</li>
                          <li>response.expect</li>
                        </ul>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">Optional:</p>
                        <ul className="list-disc list-inside space-y-0.5 ml-1">
                          <li>description (root level)</li>
                          <li>input.key (default: nodeLabel)</li>
                          <li>request.headers, request.params, request.body</li>
                          <li>response.map</li>
                        </ul>
                      </div>
                      <div className="pt-2">
                        <p className="font-medium text-foreground">URL Variables:</p>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{'{{key}}'}</code>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Test Tab */}
            <TabsContent value="test" className="flex-1 m-0 data-[state=inactive]:hidden">
              <div className="h-full flex">
                {/* Test Input */}
                <div className="w-80 border-r p-6 flex flex-col gap-6">
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
                                        placeholder={defaultValue || 'Value'}
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
                <div className="flex-1 p-6 bg-muted/20">
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4">
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
                      <div className="flex-1 flex flex-col gap-4">
                        <div
                          className={`p-3 rounded-lg border ${
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
                        {testResult.data && (
                          <div className="flex-1 min-h-0 flex flex-col">
                            <Label className="mb-2 block">Response Data</Label>
                            <div className="flex-1 min-h-[300px] rounded-md border overflow-hidden">
                              <JsonViewer data={testResult.data} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  )
}
