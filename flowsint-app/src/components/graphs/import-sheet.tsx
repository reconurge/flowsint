import { useState, useCallback } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Upload, FileText, FileSpreadsheet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ImportPreview } from './import-preview'
import { sketchService } from '@/api/sketch-service'
import { toast } from 'sonner'
import { useGraphSettingsStore } from '@/stores/graph-settings-store'
import Loader from '../loader'

interface ImportSheetProps {
  sketchId: string
}

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }, [])

  const handleFileSelect = async (selectedFile: File) => {
    // Validate file type
    const validExtensions = ['.csv', '.txt', '.xlsx', '.xls']
    const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'))
    if (!validExtensions.includes(fileExtension)) {
      alert('Please upload a CSV, TXT, or XLSX file')
      return
    }
    setFile(selectedFile)
    setIsAnalyzing(true)
    try {
      const result = await sketchService.analyzeImportFile(sketchId, selectedFile)
      setAnalysisResult(result)
    } catch (error) {
      toast.error('Failed to analyze file. Please try again.')
      setFile(null)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setAnalysisResult(null)
    setIsAnalyzing(false)
  }

  const handleClose = () => {
    handleReset()
    onOpenChange(false)
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
    if (extension === '.csv' || extension === '.txt') {
      return <FileText className="h-8 w-8" />
    }
    return <FileSpreadsheet className="h-8 w-8" />
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className={cn(
          "flex flex-col h-full overflow-hidden", // full height, vertical layout
          analysisResult ? "sm:max-w-[85vw]" : "sm:max-w-2xl"
        )}
      >
        {/* Header stays fixed */}
        <SheetHeader className="shrink-0 border-b bg-background px-6 py-4">
          <SheetTitle>Import entities</SheetTitle>
          <SheetDescription>
            Upload a CSV, TXT, or XLSX file to import entities into your sketch
          </SheetDescription>
        </SheetHeader>

        {/* Optional beta banner */}
        <div className="px-6 shrink-0">
          <div className="mt-3 rounded-md border border-primary bg-primary/20 px-3 py-2 text-xs text-primary">
            This import feature is in beta. There may be minor side effects. If you see any issue, please{" "}
            <a
              className="text-primary underline font-semibold"
              target="_blank"
              href="https://github.com/reconurge/flowsint/issues"
            >
              report them here
            </a>{" "}
            to help out the community.
          </div>
        </div>

        {/* Main scrollable zone */}
        <div className="flex flex-col flex-grow overflow-hidden p-6">
          {!file && !analysisResult && (
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center flex items-center justify-center transition-colors flex-grow overflow-auto",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
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
                  accept=".csv,.txt,.xlsx,.xls"
                  onChange={handleFileInputChange}
                />
                <Button asChild variant="outline">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Browse files
                  </label>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Supported formats: CSV, TXT, XLSX
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
              {getFileIcon(file.name)}
              <div className="flex-1">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Remove
              </Button>
            </div>
          )}

          {/* Scrollable Import Preview */}
          {analysisResult && file && (
            <div className="flex flex-col flex-grow overflow-hidden">
              <ImportPreview
                analysisResult={analysisResult}
                file={file}
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
