import React, { memo, useMemo, useState } from 'react'
import { type Node } from '@xyflow/react'
import { useFlowStore } from '@/store/flow-store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { TypeBadge } from '@/components/type-badge'
import { Card, CardContent } from "@/components/ui/card"
import { AtSignIcon, CarIcon, Mail, Search, User, UserIcon, Users } from "lucide-react"
import { usePlatformIcons } from '@/lib/hooks/use-platform-icons'
import { Input } from '@/components/ui/input'

interface NodeProps {
    node: any,
    setCurrentNode: (node: Node) => void
}

const SocialNode = ({ node, setCurrentNode }: NodeProps) => {
    const platformsIcons = usePlatformIcons()
    console.log(platformsIcons)
    const platformIcon = useMemo(() => {
        // @ts-ignore
        return platformsIcons?.[node?.data?.platform]?.icon
    }, [platformsIcons, node?.data?.platform])
    return (
        <Button variant={"ghost"} className='flex items-center justify-start p-4 !py-5 rounded-none text-left border-b' onClick={() => setCurrentNode(node)}>
            <Badge variant="secondary" className="h-7 w-7 p-0 rounded-full">
                {platformIcon}
            </Badge>
            <div className='grow truncate text-ellipsis'>{node?.data?.username || <span className='italic opacity-60'>Unknwon</span>}</div>
            <TypeBadge type={node?.type as string}></TypeBadge>
        </Button>
    )
}
export function NodeRenderer({ node, setCurrentNode }: NodeProps) {
    return (
        <>
            {node.type === "individual" && (
                <Button variant={"ghost"} className='flex items-center justify-start p-4 !py-5 rounded-none text-left border-b' onClick={() => setCurrentNode(node)}>
                    <Avatar className="h-7 w-7">
                        <AvatarImage src={node?.data?.image_url} alt={node?.data?.full_name} />
                        <AvatarFallback><UserIcon className="h-4 w-4 opacity-60" /></AvatarFallback>
                    </Avatar>
                    <div className='grow truncate text-ellipsis'>{node?.data?.full_name || node?.data?.label}</div>
                    <TypeBadge type={node?.type}></TypeBadge>
                </Button>
            )}
            {node.type === "social" && (
                <SocialNode setCurrentNode={setCurrentNode} node={node} />
            )}
            {node.type === "email" && (
                <Button variant={"ghost"} className='flex items-center justify-start p-4 !py-5 rounded-none text-left border-b' onClick={() => setCurrentNode(node)}>
                    <Badge variant="secondary" className="h-7 w-7 p-0 rounded-full">
                        <AtSignIcon className="h-4 w-4 opacity-60" />
                    </Badge>
                    <div className='grow truncate text-ellipsis'>{node?.data?.label}</div>
                    <TypeBadge type={node?.type}></TypeBadge>
                </Button>
            )}
            {node.type === "vehicle" && (
                <Button variant={"ghost"} className='flex items-center justify-start p-4 !py-5 rounded-none text-left border-b' onClick={() => setCurrentNode(node)}>
                    <Badge variant="secondary" className="h-7 w-7 p-0 rounded-full">
                        <CarIcon className="h-4 w-4 opacity-60" />
                    </Badge>
                    <div className='grow truncate text-ellipsis'>{node?.data?.label}</div>
                    <TypeBadge type={node?.type}></TypeBadge>
                </Button>
            )}
        </>
    )
}


const NodesPanel = ({ nodes }: { nodes: Node[] }) => {
    const { setCurrentNode } = useFlowStore()
    const [searchQuery, setSearchQuery] = useState("")

    // Filter nodes based on search query
    const filteredNodes = nodes?.filter((node) => {
        const searchText = searchQuery.toLowerCase()
        // Search in node name, title, label, or id - adjust based on your node structure
        return (
            //@ts-ignore
            node?.data?.label?.toLowerCase().includes(searchText) ||
            node.id.toLowerCase().includes(searchText)
        )
    })

    return (
        <div className="overflow-auto h-full flex flex-col w-full !p-0 !m-0">
            <div className="sticky top-0 p-2 bg-background z-10">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">Nodes</h3>
                    <Badge>{nodes?.length || 0}</Badge>
                    <div className="relative grow">
                        <Search className="absolute left-2.5 top-1.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search nodes..."
                            className="pl-8 h-7"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {filteredNodes?.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No nodes match your search</div>
            ) : (
                filteredNodes?.map((node: any) => <NodeRenderer node={node} setCurrentNode={setCurrentNode} key={node.id} />)
            )}
        </div>)
}

export default memo(NodesPanel)