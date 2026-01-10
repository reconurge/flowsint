import { useState, useCallback } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Upload, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ImportPreview } from './import-preview'
import { sketchService } from '@/api/sketch-service'
import { toast } from 'sonner'
import { useGraphSettingsStore } from '@/stores/graph-settings-store'
import Loader from '../loader'

interface ImportSheetProps {
  sketchId: string
}

const ALLOWED_EXTENSIONS = ['.txt', '.json']

export function ImportSheet({ sketchId }: ImportSheetProps) {
  const onOpenChange = useGraphSettingsStore((s) => s.setImportModalOpen)
  const open = useGraphSettingsStore((s) => s.importModalOpen)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      // Validate file type - only TXT files are supported
      const fileExtension = selectedFile.name
        .toLowerCase()
        .substring(selectedFile.name.lastIndexOf('.'))
      if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
        toast.error(
          `Only ${ALLOWED_EXTENSIONS.join(', ')} files are supported. Please upload file with correct format.`
        )
        return
      }
      setFile(selectedFile)
      setIsAnalyzing(true)
      try {
        const result = await sketchService.analyzeImportFile(sketchId, selectedFile)
        setAnalysisResult(result)
      } catch (error) {
        toast.error(error?.message)
        setFile(null)
      } finally {
        setIsAnalyzing(false)
      }
    },
    [sketchId]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) {
        handleFileSelect(droppedFile)
      }
    },
    [handleFileSelect]
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) {
        handleFileSelect(selectedFile)
      }
    },
    [handleFileSelect]
  )

  const handleReset = useCallback(() => {
    setFile(null)
    setAnalysisResult(null)
    setIsAnalyzing(false)
  }, [])

  const handleClose = useCallback(() => {
    handleReset()
    onOpenChange(false)
  }, [handleReset, onOpenChange])

  const getFileIcon = useCallback(() => {
    return <FileText className="h-8 w-8" />
  }, [])

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className={cn(
          'flex flex-col h-full overflow-hidden py-2', // full height, vertical layout
          analysisResult ? 'sm:max-w-[85vw]' : 'sm:max-w-2xl'
        )}
      >
        {/* Header stays fixed */}
        <SheetHeader className="shrink-0 border-b bg-background p-0 h-19 px-6 justify-center flex-col flex items-start">
          <SheetTitle>Import entities</SheetTitle>
          <SheetDescription>
            Upload a TXT file with one value per line to import entities into your sketch
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col grow overflow-hidden p-6">
          {!file && !analysisResult && (
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-12 text-center flex items-center justify-center transition-colors grow overflow-auto',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-4">
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">Drag & drop your file here</p>
                  <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                </div>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept={ALLOWED_EXTENSIONS.join(', ')}
                  onChange={handleFileInputChange}
                />
                <Button asChild variant="outline">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Browse files
                  </label>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Supported format:{' '}
                  <span className="font-bold">{ALLOWED_EXTENSIONS.join(', ')}</span> (one value per
                  line)
                </p>
              </div>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <Loader />
              <p className="text-sm text-muted-foreground">Analyzing file...</p>
            </div>
          )}

          {file && !isAnalyzing && !analysisResult && (
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              {getFileIcon()}
              <div className="flex-1">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Remove
              </Button>
            </div>
          )}

          {/* Scrollable Import Preview */}
          {analysisResult && file && (
            <div className="flex flex-col grow overflow-hidden">
              <ImportPreview
                analysisResult={analysisResult}
                sketchId={sketchId}
                onSuccess={handleClose}
                onCancel={handleReset}
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
