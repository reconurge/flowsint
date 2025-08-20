import { useCallback } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import { useActionItems } from '@/hooks/use-action-items';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { XIcon } from 'lucide-react';
import { cn, getAllNodeTypes } from '@/lib/utils';
import { Badge } from '../ui/badge';

const Filters = ({ children }: { children: React.ReactNode }) => {
    const filters = useGraphStore(s => s.filters);
    const setFilters = useGraphStore(s => s.setFilters);
    const { actionItems } = useActionItems()

    const clearFilters = useCallback(() => {
        setFilters(null)
    }, [setFilters, filters])

    const toggleFilter = useCallback((type: string | null) => {
        if (type === null) {
            clearFilters()
        } else {
            const currentTypeFilters = filters || []
            const isChecked = currentTypeFilters.includes(type)
            const newTypeFilters = isChecked ? currentTypeFilters.filter((t: string) => t !== type) : [...currentTypeFilters, type.toLowerCase()]
            setFilters(newTypeFilters)
        }
    }, [setFilters, filters, clearFilters])

    return (
        <DropdownMenu>
            <div>
                <DropdownMenuTrigger asChild>
                    <div>
                        {children}
                    </div>
                </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent className="w-48 max-h-[50vh] space-y-1 overflow-y-auto">
                <DropdownMenuLabel>
                    {filters?.length ? (
                        <Badge variant={"outline"} className="flex items-center gap-1 pr-1">
                            {filters?.length} filter(s)
                            <Button size={"icon"} variant={"ghost"} className="h-5 w-5 rounded-full" onClick={clearFilters}>
                                <XIcon className="h-3 w-3" />
                            </Button>
                        </Badge>
                    ) : (
                        "filters"
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className={cn(filters == null && "bg-primary")} onClick={() => toggleFilter(null)}>
                    All
                </DropdownMenuItem>
                {getAllNodeTypes(actionItems || []).map((type) => (
                    <DropdownMenuItem
                        className={cn(filters?.includes(type.toLowerCase()) && "bg-primary/30")}
                        key={type}
                        onClick={() => toggleFilter(type)}
                    >
                        {type || "unknown"}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default Filters; 