import {
  Copy,
  Check,
  AlertCircle,
  Trash2,
  ChevronRight,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface TemplateEditorHeaderProps {
  isEditMode: boolean
  templateName: string
  hasChanges: boolean
  hasErrors: boolean
  totalErrors: number
  validationErrors: string[]
  editorErrors: editor.IMarkerData[]
  isSaving: boolean
  copied: boolean
  deletePending: boolean
  onSave: () => void
  onDelete: () => void
  onCopy: () => void
  onGenerateClick: () => void
  onNavigateBack: () => void
}

export function TemplateEditorHeader({
  isEditMode,
  templateName,
  hasChanges,
  hasErrors,
  totalErrors,
  validationErrors,
  editorErrors,
  isSaving,
  copied,
  deletePending,
  onSave,
  onDelete,
  onCopy,
  onGenerateClick,
  onNavigateBack
}: TemplateEditorHeaderProps) {
  return (
    <header className="shrink-0 flex items-center justify-between px-4 py-2 border-b bg-card/30">
      {/* Left: Breadcrumb + Status */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={onNavigateBack}
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
                {validationErrors.map((error, i) => (
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
              onClick={onGenerateClick}
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
            <Button variant="ghost" size="sm" onClick={onCopy} className="h-7 w-7 p-0">
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
              onClick={onSave}
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
                  onClick={onDelete}
                  disabled={deletePending}
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
  )
}
