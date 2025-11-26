import { useGraphStore } from '@/stores/graph-store'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '../../ui/checkbox'
import { Separator } from '../../ui/separator'
import AdvancedFilters from './advanced-filters'

const Filters = ({ children }: { children: React.ReactNode }) => {
  const filters = useGraphStore((s) => s.filters)
  const toggleTypeFilter = useGraphStore((s) => s.toggleTypeFilter)
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div>{children}</div>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2 flex items-center gap-2 justify-between">
            <h4 className="leading-none font-medium">Filters</h4>
            <AdvancedFilters filters={filters} />
          </div>
          <Separator />
          <p className="text-muted-foreground text-sm">Filter by entity type</p>
          {Object.keys(filters).length === 0 ? (
            <p className="text-muted-foreground text-sm">No filter to display.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-2">
              {Object.keys(filters).map((key: string) => (
                <li>
                  <div className="flex items-center gap-1">
                    <Checkbox
                      checked={filters[key].checked}
                      onCheckedChange={() => toggleTypeFilter(filters[key])}
                    />
                    {filters[key].type}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default Filters
