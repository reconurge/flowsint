import React, { memo, useMemo, useState } from 'react'
import { type Node } from '@xyflow/react'
import { useFlowStore } from '@/store/flow-store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { TypeBadge } from '@/components/type-badge'
import { Card, CardContent } from "@/components/ui/card"
import { AtSignIcon, CarIcon, LocateIcon, Mail, PhoneIcon, Search, User, UserIcon, Users } from "lucide-react"
import { usePlatformIcons } from '@/lib/hooks/use-platform-icons'
import { Input } from '@/components/ui/input'
import { actionItems } from '@/lib/action-items'
import { QuestionMarkIcon } from '@radix-ui/react-icons'

interface NodeProps {
    node: any,
    setCurrentNode: (node: Node) => void
}

const SocialNode = ({ node, setCurrentNode }: NodeProps) => {
    const platformsIcons = usePlatformIcons()
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
    const item = useMemo(() => (actionItems as any).find((a: any) => a.type === node.type), [node?.type])
    const Icon = item?.icon || QuestionMarkIcon
    return (
        <>
            {node.type === "social" ?
                <SocialNode setCurrentNode={setCurrentNode} node={node} /> :
                <Button variant={"ghost"} className='flex items-center justify-start p-4 !py-5 rounded-none text-left border-b' onClick={() => setCurrentNode(node)}>
                    <Badge variant="secondary" className="h-7 w-7 p-0 rounded-full">
                        <Icon className="h-4 w-4 opacity-60" />
                    </Badge>
                    <div className='grow truncate text-ellipsis'>{node?.data?.label}</div>
                    <TypeBadge type={node?.type}></TypeBadge>
                </Button>
            }
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
                    <Badge variant={"outline"}>{nodes?.length || 0}</Badge>
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
            {filteredNodes?.length === 0 && searchQuery === "" && <div className='text-sm p-4 text-center'><p className='border rounded-md border-dashed p-4 text-center'>Right click on the panel to add your first investigation item.</p></div>}
            {filteredNodes?.length === 0 && searchQuery ? (
                <div className="p-4 text-center text-muted-foreground">No nodes match your search</div>
            ) : (
                filteredNodes?.map((node: any) => <NodeRenderer node={node} setCurrentNode={setCurrentNode} key={node.id} />)
            )}
        </div>)
}

export default memo(NodesPanel)