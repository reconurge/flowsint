import React, { memo } from 'react'
import { type Node } from '@xyflow/react'
import { useFlowStore } from '@/store/flow-store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
const NodesPanel = ({ nodes }: { nodes: Node[] }) => {
    const { setCurrentNode } = useFlowStore()
    return (
        <div className="!overflow-auto h-full flex flex-col w-full !p-0 !m-0">
            {nodes?.map((node: any) => (
                <Button variant={"ghost"} className='flex items-center justify-start p-4 !py-5 rounded-none text-left border-b' onClick={() => setCurrentNode(node)} key={node.id}>
                    <Avatar className="h-7 w-7">
                        <AvatarImage src={node?.data?.image_url} alt={node?.data?.full_name} />
                        <AvatarFallback>{node?.data?.full_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className='grow truncate text-ellipsis'>{node?.data?.full_name || node?.data?.label}</div>
                    <Badge variant={"outline"}>{node?.type}</Badge>
                </Button>
            ))}
        </div>
    )
}

export default memo(NodesPanel)