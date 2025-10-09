import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useQuery } from '@tanstack/react-query'
import { type Investigation } from '@/types/investigation'
import { investigationService } from '@/api/investigation-service'
import { useNavigate, useParams } from '@tanstack/react-router'
import { Search, ChevronDown, Plus, FolderOpen } from 'lucide-react'
import NewInvestigation from '@/components/investigations/new-investigation'
import { queryKeys } from '@/api/query-keys'

export default function InvestigationSelector() {
  const navigate = useNavigate()
  const { investigationId } = useParams({ strict: false })
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: investigations, isLoading } = useQuery({
    queryKey: queryKeys.investigations.selector(investigationId as string),
    queryFn: investigationService.get,
    refetchOnWindowFocus: true
  })

  const handleSelectionChange = (value: string) => {
    navigate({
      to: '/dashboard/investigations/$investigationId',
      params: {
        investigationId: value as string
      }
    })
    setOpen(false)
  }

  // Filter investigations based on search
  const filteredInvestigations =
    investigations?.filter(
      (investigation: Investigation) =>
        !searchQuery || investigation.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || []

  const currentInvestigation = investigations?.find(
    (inv: Investigation) => inv.id === investigationId
  )

  return (
    <div className="flex items-center">
      {isLoading ? (
        <Skeleton className="h-7 w-40 bg-foreground/10" />
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div>
              <Button
                variant="ghost"
                className="min-w-none !h-7 rounded-sm w-full !bg-transparent hover:bg-foreground/10 font-medium shadow-none border-none text-ellipsis truncate gap-1 inset-shadow-none justify-between"
              >
                <span className="text-ellipsis truncate">
                  {currentInvestigation?.name || 'Select an investigation'}
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
                  placeholder="Search investigations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto">
              {filteredInvestigations.map((investigation: Investigation) => (
                <Button
                  key={investigation.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-auto py-1.5 px-2 rounded-none hover:bg-accent text-sm"
                  onClick={() => handleSelectionChange(investigation.id)}
                >
                  <FolderOpen className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-left truncate">{investigation.name}</span>
                </Button>
              ))}
            </div>
            <Separator className="my-0.5" />
            <div className="py-0.5">
              <NewInvestigation noDropDown={true}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-auto py-1.5 px-2 rounded-none hover:bg-accent text-muted-foreground hover:text-foreground text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-left truncate">Create new investigation</span>
                </Button>
              </NewInvestigation>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
