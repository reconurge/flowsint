import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useQuery } from '@tanstack/react-query'
import { type Sketch } from '@/types/sketch'
import { type Analysis } from '@/types'
import { useNavigate, useParams } from '@tanstack/react-router'
import { investigationService } from '@/api/investigation-service'
import { analysisService } from '@/api/analysis-service'
import { Waypoints, FileText, Search, ChevronDown, Plus, ArrowLeft, Home } from 'lucide-react'
import NewSketch from '@/components/sketches/new-sketch'
import { queryKeys } from '@/api/query-keys'

export default function CaseSelector() {
  const navigate = useNavigate()
  const { id, investigationId, type } = useParams({ strict: false })
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: investigation, isLoading: isLoadingInvestigation } = useQuery({
    queryKey: queryKeys.sketches.dashboard(investigationId as string),
    queryFn: () => investigationService.getById(investigationId as string),
    enabled: !!investigationId,
    refetchOnWindowFocus: true
  })

  const { data: analyses, isLoading: isLoadingAnalyses } = useQuery({
    queryKey: queryKeys.analyses.dashboard(investigationId as string),
    queryFn: () => analysisService.getByInvestigationId(investigationId as string),
    enabled: !!investigationId,
    refetchOnWindowFocus: true
  })

  const isLoading = isLoadingInvestigation || isLoadingAnalyses

  const handleSelectionChange = (value: string) => {
    if (value === 'overview') {
      navigate({
        to: '/dashboard/investigations/$investigationId',
        params: {
          investigationId: investigationId as string
        }
      })
    } else {
      // Check if the selected value is a sketch or analysis
      const isSketch = investigation?.sketches?.some((sketch: Sketch) => sketch.id === value)
      const isAnalysis = analyses?.some((analysis: Analysis) => analysis.id === value)

      const itemType = isSketch ? 'graph' : isAnalysis ? 'analysis' : type

      navigate({
        to: '/dashboard/investigations/$investigationId/$type/$id',
        params: {
          investigationId: investigationId as string,
          type: itemType as string,
          id: value as string
        }
      })
    }
    setOpen(false)
  }

  // Filter items based on search
  const filteredSketches =
    investigation?.sketches?.filter(
      (sketch: Sketch) =>
        !searchQuery || sketch.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) || []

  const filteredAnalyses =
    analyses?.filter(
      (analysis: Analysis) =>
        !searchQuery || analysis.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) || []

  return (
    <div className="flex items-center">
      {isLoading ? (
        <Skeleton className="!h-7 w-40 bg-foreground/10" />
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div>
              <Button
                variant="ghost"
                className="min-w-none !h-7 rounded-sm w-full !bg-transparent hover:bg-foreground/10 font-medium shadow-none border-none text-ellipsis truncate gap-1 inset-shadow-none justify-between"
              >
                <span className="text-ellipsis truncate">
                  {id === 'overview' || !id
                    ? 'Overview'
                    : investigation?.sketches?.find((s: Sketch) => s.id === id)?.title ||
                      analyses?.find((a: Analysis) => a.id === id)?.title ||
                      'Overview'}
                </span>
                <ChevronDown className="w-4 h-4 shrink-0" />
              </Button>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sketches and analyses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto">
              {/* Overview Section */}
              <div className="py-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-auto py-1.5 px-2 rounded-none hover:bg-accent text-sm"
                  onClick={() => handleSelectionChange('overview')}
                >
                  <span className="text-left truncate flex items-center gap-1 text-muted-foreground">
                    <Home strokeWidth={1.5} />
                    <ArrowLeft strokeWidth={1.5} /> back to case
                  </span>
                </Button>
              </div>

              {/* Sketches Section */}
              {filteredSketches.length > 0 && (
                <div className="py-0.5">
                  {filteredSketches.map((sketch: Sketch) => (
                    <Button
                      key={sketch.id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 h-auto py-1.5 px-2 rounded-none hover:bg-accent text-sm"
                      onClick={() => handleSelectionChange(sketch.id)}
                    >
                      <Waypoints className="w-4 h-4 text-yellow-500 shrink-0" />
                      <span className="text-left truncate">{sketch.title}</span>
                    </Button>
                  ))}
                </div>
              )}

              {/* Analyses Section */}
              {filteredAnalyses.length > 0 && (
                <div className="py-0.5">
                  {filteredAnalyses.map((analysis: Analysis) => (
                    <Button
                      key={analysis.id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 h-auto py-1.5 px-2 rounded-none hover:bg-accent text-sm"
                      onClick={() => handleSelectionChange(analysis.id)}
                    >
                      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="text-left truncate">{analysis.title}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <Separator className="my-0.5" />
            <div className="py-0.5">
              <NewSketch>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-auto py-1.5 px-2 rounded-none hover:bg-accent text-muted-foreground hover:text-foreground text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-left truncate">Create new sketch</span>
                </Button>
              </NewSketch>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
