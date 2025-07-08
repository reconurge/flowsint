import type React from "react"
import { memo, useMemo, useState, useCallback, useRef } from "react"
import { useVirtualizer } from '@tanstack/react-virtual'
import { useGraphStore } from "@/stores/graph-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TypeBadge } from "@/components/type-badge"
import { Search, FilterIcon, XIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { actionItems } from "@/lib/action-items"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { GraphNode } from "@/stores/graph-store"
import { Checkbox } from "@/components/ui/checkbox"

// Hauteur fixe pour chaque item (en pixels)
const ITEM_HEIGHT = 40

// Function to extract all leaf-level node types from actionItems
const getAllNodeTypes = () => {
    const types: string[] = []
    actionItems.forEach(item => {
        if (item.children) {
            item.children.forEach(child => {
                if (child.type && !types.includes(child.type)) {
                    types.push(child.type)
                }
            })
        } else if (item.type && !types.includes(item.type)) {
            types.push(item.type)
        }
    })
    return types.sort()
}
// Mémoiser le composant NodeRenderer
const NodeRenderer = memo(
    ({
        node,
        setCurrentNode,
        onCheckboxChange,
        isNodeChecked,
    }: {
        node: any
        setCurrentNode: (node: GraphNode) => void
        onCheckboxChange: (node: GraphNode, checked: boolean) => void
        isNodeChecked: (nodeId: string) => boolean
    }) => {
        const handleClick = useCallback(() => setCurrentNode(node), [node, setCurrentNode])
        const handleCheckboxChange = useCallback(
            (checked: boolean) => {
                onCheckboxChange(node, checked)
            },
            [node, onCheckboxChange],
        )

        return (
            <div className="flex items-center overflow-hidden hover:bg-muted border-b h-full">
                <div className="pl-2">
                    <Checkbox checked={isNodeChecked(node.id)} onCheckedChange={handleCheckboxChange} className="mr-1 border-border" />
                </div>
                <Button
                    variant={"ghost"}
                    className={cn(
                        "flex-1 flex truncate mt-0 overflow-hidden items-center justify-start p-4 !py-5 rounded-none text-left border-l-2 border-l-transparent h-full",
                    )}
                    onClick={handleClick}
                >
                    <div className="grow truncate text-ellipsis">{node?.data?.label}</div>
                    <TypeBadge type={node?.data?.type} />
                </Button>
            </div>
        )
    },
)

// Composant pour un item virtualisé
const VirtualizedItem = memo(({
    node,
    setCurrentNode,
    onCheckboxChange,
    isNodeChecked
}: {
    index: number
    node: GraphNode
    setCurrentNode: (node: GraphNode) => void
    onCheckboxChange: (node: GraphNode, checked: boolean) => void
    isNodeChecked: (nodeId: string) => boolean
}) => {
    return (
        <NodeRenderer
            node={node}
            setCurrentNode={setCurrentNode}
            onCheckboxChange={onCheckboxChange}
            isNodeChecked={isNodeChecked}
        />
    )
})

const NodesPanel = memo(({ nodes, isLoading }: { nodes: GraphNode[]; isLoading?: boolean }) => {
    const setCurrentNode = useGraphStore((state) => state.setCurrentNode)
    const setSelectedNodes = useGraphStore((state) => state.setSelectedNodes)
    const selectedNodes = useGraphStore((state) => state.selectedNodes || [])
    const [searchQuery, setSearchQuery] = useState<string>("")
    const [filters, setFilters] = useState<null | string[]>(null)

    // Ref pour le conteneur parent du virtualizer
    const parentRef = useRef<HTMLDivElement>(null)

    const filteredNodes = useMemo(() => {
        const searchText = searchQuery.toLowerCase()
        return nodes?.filter((node) => {
            const matchesSearch =
                //@ts-ignore
                node?.data?.label?.toLowerCase().includes(searchText) || node?.id?.toLowerCase().includes(searchText)

            const matchesFilter = !filters || filters.some(filter =>
                filter.toLowerCase() === (node?.data?.type as string)?.toLowerCase()
            )

            return matchesSearch && matchesFilter
        })
    }, [nodes, searchQuery, filters])

    // Configuration du virtualizer
    const virtualizer = useVirtualizer({
        count: filteredNodes?.length || 0,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ITEM_HEIGHT,
        overscan: 5, // Nombre d'éléments à pré-rendre en dehors de la zone visible
    })

    const toggleFilter = useCallback((filter: string | null) => {
        if (filter === null) {
            setFilters(null)
        } else {
            setFilters((prev) => {
                if (prev === null) return [filter]
                const next = prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
                return next.length === 0 ? null : next
            })
        }
    }, [])

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value)
    }, [])

    const clearFilters = useCallback(() => {
        setFilters(null)
    }, [])

    const isNodeChecked = useCallback(
        (nodeId: string) => {
            return selectedNodes.some((node) => node.id === nodeId)
        },
        [selectedNodes],
    )

    const handleCheckAll = useCallback(
        (checked: boolean) => {
            if (!checked) {
                setSelectedNodes([])
                return
            }
            if (filters?.length || searchQuery) {
                setSelectedNodes(filteredNodes)
            }
            else setSelectedNodes(nodes)
        },
        [nodes, filteredNodes, filters, searchQuery, selectedNodes, setSelectedNodes],
    )

    const handleCheckboxChange = useCallback(
        (node: GraphNode, checked: boolean) => {
            if (checked) {
                setSelectedNodes([...selectedNodes.filter((n) => n.id !== node.id), node])
            } else {
                setSelectedNodes(selectedNodes.filter((n) => n.id !== node.id))
            }
        },
        [selectedNodes, setSelectedNodes],
    )

    return (
        <div className="overflow-hidden bg-card h-full flex flex-col w-full !p-0 !m-0">
            {/* Header fixe */}
            <div className="sticky border-b top-0 p-2 bg-card z-10 flex-shrink-0">

                <div className="flex items-center gap-2">
                    <div>
                        <Checkbox onCheckedChange={handleCheckAll} className="mr-1" />
                    </div>
                    <Badge className="h-7" variant={"outline"}>
                        <span className="font-semibold">
                            {(filters?.length || searchQuery) ? `${filteredNodes?.length} / ${nodes?.length || 0}` : nodes?.length || 0}</span>{" "}
                        <span className="font-normal opacity-60">nodes</span>
                    </Badge>
                    <div className="relative grow">
                        <Search className="absolute left-2.5 top-1.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search..."
                            className="pl-8 h-7 border-border"
                            value={searchQuery}
                            onChange={handleSearchChange}
                        />
                    </div>
                    <DropdownMenu>
                        <div>
                            <DropdownMenuTrigger asChild>
                                <div>
                                    <Button variant={"outline"} className="h-7 w-8 relative border-border border" size={"icon"}>
                                        <FilterIcon className={cn("opacity-60 h-3 w-3", filters && "opacity-100")} />
                                        {filters && (
                                            <Badge className="absolute -top-2 -right-1 text-xs rounded-full h-4 w-4 text-white" variant={"default"}>
                                                {filters.length}
                                            </Badge>
                                        )}
                                    </Button>
                                </div>
                            </DropdownMenuTrigger>
                        </div>
                        <DropdownMenuContent className="w-48 max-h-[50vh] space-y-1 overflow-y-auto">
                            <DropdownMenuLabel>
                                {filters ? (
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
                            {getAllNodeTypes().map((type) => (
                                <DropdownMenuItem
                                    className={cn(filters?.includes(type) && "bg-primary/30")}
                                    key={type}
                                    onClick={() => toggleFilter(type)}
                                >
                                    {type || "unknown"}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Contenu principal */}
            <div className="flex-1 min-h-0">
                {!isLoading && filteredNodes?.length === 0 && searchQuery === "" && (
                    <div className="text-sm p-4 text-center">
                        <p className="border rounded-md border-dashed p-4 text-center">
                            Drag and drop you first node in the "items" section.
                        </p>
                    </div>
                )}
                {/* {isLoading || !filteredNodes?.length && (
                    <div className="p-2"><SkeletonList rowCount={7} /></div>
                )} */}

                {filteredNodes?.length === 0 && searchQuery && (
                    <div className="p-4 text-center text-muted-foreground">
                        No nodes match your search
                    </div>
                )}

                {/* Liste virtualisée */}
                {!isLoading && filteredNodes && filteredNodes.length > 0 && (
                    <div
                        ref={parentRef}
                        className="h-full overflow-auto"
                        style={{
                            contain: 'strict',
                        }}
                    >
                        <div
                            style={{
                                height: `${virtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            {virtualizer.getVirtualItems().map((virtualItem) => {
                                const node = filteredNodes[virtualItem.index]
                                return (
                                    <div
                                        key={virtualItem.key}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualItem.size}px`,
                                            transform: `translateY(${virtualItem.start}px)`,
                                        }}
                                    >
                                        <VirtualizedItem
                                            index={virtualItem.index}
                                            node={node}
                                            setCurrentNode={setCurrentNode}
                                            onCheckboxChange={handleCheckboxChange}
                                            isNodeChecked={isNodeChecked}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
})

export default NodesPanel