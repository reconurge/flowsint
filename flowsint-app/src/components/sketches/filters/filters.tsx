import { useGraphStore } from '@/stores/graph-store'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components//ui/separator'
import TypeFilters from './type-filters'
import RuleFilters from './rule-filters'

const Filters = ({ children }: { children: React.ReactNode }) => {
  const filters = useGraphStore((s) => s.filters)
  const toggleTypeFilter = useGraphStore((s) => s.toggleTypeFilter)
  const setFilters = useGraphStore((s) => s.setFilters)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div>{children}</div>
      </PopoverTrigger>
      <PopoverContent className="w-112 bg-background max-h-[60vh] overflow-auto">
        <div className="grid gap-2">
          <div className="space-y-1">
            <h5 className="leading-none font-medium text-sm">Filters</h5>
          </div>
          <Separator />
          <TypeFilters filters={filters} toggleTypeFilter={toggleTypeFilter} />
          {/* <Separator />
          <RuleFilters filters={filters} setFilters={setFilters} /> */}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default Filters
