import { Checkbox } from '@/components/ui/checkbox'
import { TypeFilter, Filters } from '@/types/filter'
import { useTranslation } from 'react-i18next'

type TypeFiltersProps = {
    filters: Filters,
    toggleTypeFilter: (filter: TypeFilter) => void
}
const TypeFilters = ({ filters, toggleTypeFilter }: TypeFiltersProps) => {
    const { t } = useTranslation()
    return (
        <div className='space-y-2'>
            <p className="opacity-90 text-sm">{t('sketches.filters.filterByEntity', { defaultValue: 'Filter by entity type' })}</p>
            {filters.types.length === 0 ? (
                <p className="text-muted-foreground text-xs">{t('sketches.filters.noFilter', { defaultValue: 'No filter to display.' })}</p>
            ) : (
                <ul className="grid grid-cols-3 gap-2">
                    {filters.types.map((filter) => (
                        <li>
                            <div className="flex items-center gap-1">
                                <Checkbox
                                    checked={filter.checked}
                                    onCheckedChange={() => toggleTypeFilter(filter)}
                                />
                                {t('types.' + filter.type.toLowerCase() + '.name', { defaultValue: filter.type })}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default TypeFilters