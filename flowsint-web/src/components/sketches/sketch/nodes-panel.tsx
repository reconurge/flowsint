import React, { memo, useMemo, useState, useCallback } from 'react'
import { useSketchStore } from '@/store/sketch-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TypeBadge } from '@/components/type-badge'
import { Search, HelpCircle, FilterIcon, XIcon } from "lucide-react"
import { usePlatformIcons } from '@/lib/hooks/use-platform-icons'
import { Input } from '@/components/ui/input'
import { actionItems } from '@/lib/action-items'
import { cn } from '@/lib/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import Loader from '@/components/loader'
import { IconContainer } from '@/components/icon-container'
import { NodeData } from '@/types'

// Mémoiser le composant SocialNode
const SocialNode = memo(({ node, setCurrentNode, isSelected }: {
    node: any,
    setCurrentNode: (node: NodeData) => void,
    isSelected: any
}) => {
    const platformsIcons = usePlatformIcons()
    const platformIcon = useMemo(() => {
        // @ts-ignore
        return platformsIcons?.[node?.data?.platform]?.icon
    }, [platformsIcons, node?.data?.platform])

    const handleClick = useCallback(() => setCurrentNode(node), [node, setCurrentNode])

    return (
        <Button
            variant={"ghost"}
            className={cn(
                'flex items-center justify-start p-4 !py-5 rounded-none text-left border-b border-l-2 border-l-transparent',
                isSelected(node.id) && 'border-l-primary bg-background'
            )}
            onClick={handleClick}
        >
            <Badge variant="secondary" className="h-7 w-7 p-0 rounded-full">
                {platformIcon}
            </Badge>
            <div className='grow truncate text-ellipsis'>
                {node?.data?.username || <span className='italic opacity-60'>Unknown</span>}
            </div>
            <TypeBadge type={node?.data?.type as string} />
        </Button>
    )
})

// Mémoiser le composant NodeRenderer
const NodeRenderer = memo(({
    node,
    setCurrentNode,
    isSelected
}: {
    node: any,
    setCurrentNode: (node: NodeData) => void,
    isSelected: any
}) => {
    const item = useMemo(() =>
        (actionItems as any).find((a: any) => a?.type === node.data?.type),
        [node.data?.type]
    )
    const Icon = item?.icon || HelpCircle

    const handleClick = useCallback(() => setCurrentNode(node), [node, setCurrentNode])

    if (node.data?.type === "social") {
        return <SocialNode
            setCurrentNode={setCurrentNode}
            node={node}
            isSelected={isSelected}
        />
    }
    return (
        <Button
            variant={"ghost"}
            className={cn(
                'flex items-center justify-start p-4 !py-5 hover:bg-background rounded-none text-left border-b border-l-2 border-l-transparent',
                isSelected(node.id) && 'border-l-primary bg-background'
            )}
            onClick={handleClick}
        >
            <IconContainer
                type={node?.data?.type}
                icon={Icon}
                size={12}
            />
            <div className='grow truncate text-ellipsis'>{node?.data?.label}</div>
            <TypeBadge type={node?.data?.type} />
        </Button>
    )
})

const NodesPanel = memo(({ nodes, isLoading }: { nodes: NodeData[], isLoading?: boolean }) => {

    const setCurrentNode = useSketchStore(state => state.setCurrentNode)
    const isSelected = useSketchStore(state => state.isSelected)
    const [searchQuery, setSearchQuery] = useState<string>("")
    const [filters, setFilters] = useState<null | string[]>(null) // 'individual', 'email', etc.
    const filteredNodes = useMemo(() => {
        const searchText = searchQuery.toLowerCase()
        return nodes?.filter((node) => {
            const matchesSearch =
                //@ts-ignore
                node?.data?.label?.toLowerCase().includes(searchText) ||
                node?.id?.toLowerCase().includes(searchText)

            const matchesFilter = !filters || filters.includes(node?.data?.type as string)

            return matchesSearch && matchesFilter
        })
    }, [nodes, searchQuery, filters])

    const toggleFilter = useCallback((filter: string | null) => {
        if (filter === null) {
            setFilters(null)
        } else {
            setFilters(prev => {
                if (prev === null) return [filter]
                const next = prev.includes(filter)
                    ? prev.filter(f => f !== filter)
                    : [...prev, filter]
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

    return (
        <div className="overflow-auto bg-card h-full flex flex-col w-full !p-0 !m-0">
            <div className="sticky border-b top-0 p-2 bg-card z-10">
                <div className="flex items-center gap-2">
                    <Badge className='h-7' variant={"outline"}><span className='font-semibold'>{nodes?.length || 0}</span> <span className='font-normal opacity-60'>nodes</span></Badge>
                    <div className="relative grow">
                        <Search className="absolute left-2.5 top-1.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search nodes..."
                            className="pl-8 h-7"
                            value={searchQuery}
                            onChange={handleSearchChange}
                        />
                    </div>
                    <DropdownMenu>
                        <div>
                            <DropdownMenuTrigger asChild>
                                <Button variant={"outline"} className="h-7 w-8 relative" size={"icon"}>
                                    <FilterIcon className={cn("opacity-60 h-3 w-3", filters && 'opacity-100')} />
                                    {filters && <Badge className='absolute -top-2 -right-1 text-xs rounded-full h-4 w-4' variant={"default"}>{filters.length}</Badge>}
                                </Button>
                            </DropdownMenuTrigger>
                        </div>
                        <DropdownMenuContent className="w-48 max-h-[50vh] space-y-1 overflow-y-auto">
                            <DropdownMenuLabel>{filters ? <Badge variant={"outline"} className='flex items-center gap-1 pr-1'>{filters?.length} filter(s)<Button size={"icon"} variant={"ghost"} className='h-5 w-5 rounded-full' onClick={clearFilters}><XIcon className='h-3 w-3' /></Button></Badge> : "filters"}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className={cn(filters == null && "bg-primary")} onClick={() => toggleFilter(null)}>All</DropdownMenuItem>
                            {actionItems.map((item) => (
                                <DropdownMenuItem className={cn(filters?.includes(item?.type) && "bg-primary/30")} key={item.id} onClick={() => toggleFilter(item?.type)}>{item?.type || "unknown"}</DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            {isLoading && <div className='text-sm p-4 text-center'>
                <Loader label="Loading..." />
            </div>}
            {!isLoading && filteredNodes?.length === 0 && searchQuery === "" && (
                <div className='text-sm p-4 text-center'>
                    <p className='border rounded-md border-dashed p-4 text-center'>
                        Right click on the panel to add your first investigation item.
                    </p>
                </div>
            )}
            {filteredNodes?.length === 0 && searchQuery ? (
                <div className="p-4 text-center text-muted-foreground">
                    No nodes match your search
                </div>
            ) : (
                filteredNodes?.map((node: any) => (
                    <NodeRenderer
                        node={node}
                        isSelected={isSelected}
                        setCurrentNode={setCurrentNode}
                        key={node.id}
                    />
                ))
            )}
        </div>
    )
})

export default NodesPanel