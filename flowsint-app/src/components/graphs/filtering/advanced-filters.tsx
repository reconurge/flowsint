import {
    Dialog, DialogClose, DialogContent, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Switch } from "@/components/ui/switch"
import { memo, useCallback, useEffect, useState } from "react"
import { useActionItems } from "@/hooks/use-action-items"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useGraphStore } from "@/stores/graph-store"
import { Filters, Filter } from "@/types"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff } from "lucide-react"

const AdvancedFilters = ({ filters }: { filters: Filters }) => {
    const { actionItems, isLoading } = useActionItems()
    const setFilters = useGraphStore(s => s.setFilters)
    const [advancedFilters, setAdvancedFilters] = useState<Filters>(filters)

    useEffect(() => {
        if (!actionItems?.length) return
        const flat = actionItems.flatMap(i => i.children ?? [])
        setAdvancedFilters(prev => {
            const clone = structuredClone(prev)
            for (const key in clone) {
                const filter = clone[key]
                const item = flat.find(i => i?.key === filter.type)
                if (!item) continue
                filter.fields = item.fields.map(f => ({
                    name: f.name,
                    type: f.type,
                    pattern: "",
                    operator: null,
                    checked: false,
                    options: f.options
                }))
            }
            return clone
        })
    }, [actionItems])

    const updateFilter = useCallback((filter: Filter) => {
        setAdvancedFilters(prev => ({
            ...prev,
            [filter.type]: filter
        }))
    }, [])

    const applyFilters = useCallback(() => {
        setFilters(advancedFilters)
    }, [advancedFilters, setFilters])

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button className='text-primary underline text-sm cursor-pointer'>Advanced</button>
            </DialogTrigger>
            <DialogContent className='!w-[90vw] !max-w-[650px] h-[80vh]'>
                <DialogHeader>
                    <DialogTitle>Advanced Filters</DialogTitle>
                </DialogHeader>
                {isLoading ? "Loading..." : (
                    <div className="gap-2 h-full w-full overflow-hidden">
                        <Tabs defaultValue="nodes" className="h-full w-full">
                            <TabsList className="w-full">
                                <TabsTrigger value="nodes">Nodes</TabsTrigger>
                                <TabsTrigger value="edges">Edges</TabsTrigger>
                                <TabsTrigger value="raw">Raw</TabsTrigger>
                            </TabsList>
                            <TabsContent value="nodes" className="overflow-auto p-1">
                                <FilterList
                                    filters={advancedFilters}
                                    updateFilter={updateFilter}
                                />
                            </TabsContent>
                            <TabsContent value="edges">
                                Not implemented yet.
                            </TabsContent>
                            <TabsContent value="raw" className="overflow-auto">
                                <pre>
                                    <code>
                                        {JSON.stringify(advancedFilters, null, 2)}
                                    </code>
                                </pre>
                            </TabsContent>
                        </Tabs>
                    </div>
                )
                }
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={applyFilters}>Apply filters</Button>
                </DialogFooter>
            </DialogContent >
        </Dialog >
    )
}

export default AdvancedFilters

const FilterList = memo(
    ({ filters, updateFilter }: { filters: Filters, updateFilter: (f: Filter) => void }) => {
        return (
            <div className="flex flex-col gap-2">
                {Object.keys(filters).map(key => (
                    <FilterItem
                        key={key}
                        filter={filters[key]}
                        updateFilter={updateFilter}
                    />
                ))}
            </div>
        )
    }
)

const FilterItem = memo(
    ({ filter, updateFilter }: { filter: Filter, updateFilter: (f: Filter) => void }) => {
        const toggleFilter = useCallback((checked: boolean) => {
            updateFilter({ ...filter, checked })
        }, [filter, updateFilter])
        const updateField = useCallback((name: string, patch: any) => {
            const updated = {
                ...filter,
                checked: true,
                fields: filter.fields?.map(f => f.name === name ? { ...f, ...patch } : f)
            }
            updateFilter(updated)
        }, [filter, updateFilter])

        return (
            <Accordion type="single" collapsible>
                <AccordionItem className="border !border-b px-3 rounded" value={filter.type}>
                    <AccordionTrigger className="hover:no-underline">
                        <div className="grow flex items-center justify-between">
                            {filter.type}
                            <div className="flex items-center gap-2">
                                <Badge variant={"outline"} className="">
                                    {filter.checked ? <span className="flex items-center gap-1"><Eye className="h-4 w-4 opacity-60" /> all visible</span> :
                                        <span className="flex items-center gap-1"><EyeOff className="h-4 w-4 opacity-60" /> all hidden</span>
                                    }
                                </Badge>
                                <Switch
                                    onClick={(e) => e.stopPropagation()}
                                    checked={filter.checked}
                                    onCheckedChange={toggleFilter}
                                />
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="mt-2 space-y-2">
                        {filter.fields?.map(field => (
                            <FieldRow
                                filter={filter}
                                key={field.name}
                                field={field}
                                update={patch => updateField(field.name, patch)}
                            />
                        ))}
                    </AccordionContent>
                </AccordionItem >
            </Accordion >
        )
    }
)

const FieldRow = memo(
    ({ filter, field, update }: { filter: Filter, field: any, update: (p: any) => void }) => {
        return (
            <div className={cn("flex p-2 border rounded items-center gap-4",
                field.checked ? "bg-primary/5 border-primary/40" : "bg-muted",
                !filter.checked && "opacity-50"
            )}>
                <Checkbox
                    checked={field.checked}
                    onCheckedChange={(c) => update({ checked: Boolean(c) })}
                />
                <span className="flex-1 truncate">{field.name}</span>
                <Select
                    value={field.operator ?? ""}
                    onValueChange={(value) => update({ operator: value })}
                >
                    <SelectTrigger className={cn("!h-7 w-28", field.checked ? "bg-primary/10 border-primary/40" : "bg-muted")}>
                        <SelectValue placeholder="Operator" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Operator</SelectLabel>
                            <SelectItem value="is">is exactly</SelectItem>
                            <SelectItem value="isLike">is like</SelectItem>
                            <SelectItem value="startsWith">starts with</SelectItem>
                            <SelectItem value="endsWith">starts with</SelectItem>
                            <SelectItem value="not">is not</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
                <Input
                    value={field.pattern ?? ""}
                    onChange={(e) => update({ pattern: e.target.value })}
                    className={cn("!h-7 w-28", field.checked ? "bg-primary/10 border-primary/40" : "bg-muted")}
                    type={field.type}
                />
            </div>
        )
    }
)
