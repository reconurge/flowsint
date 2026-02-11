import { Play, FlaskConical, Loader2, CheckCircle2, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'

import { JsonViewer } from './json-viewer'
import type { TemplateData } from './template-schema'

export interface TestResult {
  success: boolean
  data?: unknown
  error?: string
  duration?: number
  url?: string
  raw_results?: Record<string, unknown>
}

interface TemplateTestPanelProps {
  testInput: string
  testParams: Record<string, string>
  testResult: TestResult | null
  isTesting: boolean
  hasErrors: boolean
  validationData: TemplateData | undefined
  paramKeys: string[]
  templateParams: Record<string, unknown>
  onTestInputChange: (value: string) => void
  onTestParamsChange: (params: Record<string, string>) => void
  onRunTest: () => void
  buildPreviewUrl: () => string
}

export function TemplateTestPanel({
  testInput,
  testParams,
  testResult,
  isTesting,
  hasErrors,
  validationData,
  paramKeys,
  templateParams,
  onTestInputChange,
  onTestParamsChange,
  onRunTest,
  buildPreviewUrl
}: TemplateTestPanelProps) {
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* Test Input */}
      <ResizablePanel defaultSize={30} minSize={20}>
      <div className="h-full p-6 flex flex-col gap-6 overflow-y-auto">
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
              {validationData?.input?.key && (
                <span className="text-muted-foreground ml-1">({validationData.input.key})</span>
              )}
            </Label>
            <Input
              id="test-input"
              placeholder={`Enter ${validationData?.input?.type || 'value'}...`}
              value={testInput}
              onChange={(e) => onTestInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onRunTest()}
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
                        <tr key={paramKey} className={idx < paramKeys.length - 1 ? 'border-b' : ''}>
                          <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">
                            {paramKey}
                          </td>
                          <td className="px-1 py-1">
                            <Input
                              placeholder={String(defaultValue) || 'Value'}
                              value={testParams[paramKey] ?? ''}
                              onChange={(e) =>
                                onTestParamsChange({
                                  ...testParams,
                                  [paramKey]: e.target.value
                                })
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

          {validationData?.request?.url && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Request URL</Label>
              <code className="block text-xs bg-muted p-2 rounded break-all">
                {buildPreviewUrl()}
              </code>
            </div>
          )}

          <Button
            onClick={onRunTest}
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
            <p className="text-sm text-destructive">Fix validation errors before testing.</p>
          </div>
        )}
      </div>
      </ResizablePanel>
      <ResizableHandle className="hover:bg-primary/20 active:bg-primary/30 transition-colors data-[resize-handle-state=drag]:bg-primary/30" />
      {/* Test Result */}
      <ResizablePanel defaultSize={70} minSize={30}>
      <div className="h-full p-4 bg-muted/20 overflow-y-auto">
        <div className="h-full flex flex-col">
          <div className="shrink-0 flex items-center justify-between mb-4">
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
                className={`shrink-0 p-2 rounded-lg border ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-destructive/10 border-destructive/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <span className="font-medium text-emerald-600">Request Successful</span>
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
              {(testResult?.data?.raw_results != null || testResult?.data?.results != null) && (
                <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0">
                  {testResult?.data?.raw_results != null && (
                    <>
                      <ResizablePanel defaultSize={50} minSize={20}>
                        <div className="h-full flex flex-col">
                          <Label className="shrink-0 mb-2 block">Raw response</Label>
                          <div className="flex-1 min-h-0 rounded-md border overflow-hidden">
                            <JsonViewer data={testResult.data.raw_results} />
                          </div>
                        </div>
                      </ResizablePanel>
                      {testResult?.data?.results != null && (
                        <ResizableHandle className="my-2 hover:bg-primary/20 active:bg-primary/30 transition-colors data-[resize-handle-state=drag]:bg-primary/30" />
                      )}
                    </>
                  )}
                  {testResult?.data?.results != null && (
                    <ResizablePanel defaultSize={50} minSize={20}>
                      <div className="h-full flex flex-col">
                        <Label className="shrink-0 mb-2 block">Inserted nodes</Label>
                        <div className="flex-1 min-h-0 rounded-md border overflow-hidden">
                          <JsonViewer data={testResult.data.results} />
                        </div>
                      </div>
                    </ResizablePanel>
                  )}
                </ResizablePanelGroup>
              )}
            </div>
          )}
        </div>
      </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
