import { Checkbox } from '@/components/ui/checkbox'
import { TypeFilter, Filters } from '@/types/filter'

type TypeFiltersProps = {
    filters: Filters,
    toggleTypeFilter: (filter: TypeFilter) => void
}
const TypeFilters = ({ filters, toggleTypeFilter }: TypeFiltersProps) => {
    return (
        <div className='space-y-2'>
            <p className="opacity-90 text-sm">Filter by entity type</p>
            {filters.types.length === 0 ? (
                <p className="text-muted-foreground text-xs">No filter to display.</p>
            ) : (
                <ul className="grid grid-cols-3 gap-2">
                    {filters.types.map((filter) => (
                        <li>
                            <div className="flex items-center gap-1">
                                <Checkbox
                                    checked={filter.checked}
                                    onCheckedChange={() => toggleTypeFilter(filter)}
                                />
                                {filter.type}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default TypeFilters