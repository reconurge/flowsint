import { GraphNode, useGraphStore } from "@/stores/graph-store";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Users, Link, Filter } from "lucide-react";
import { useIcon } from "@/hooks/use-icon";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CopyButton } from "../copy";

export type RelationshipType = {
    source: GraphNode
    target: GraphNode
    edge: { label: string }
}

const ITEM_HEIGHT = 67; // Balanced spacing between items (55px card + 12px padding)

// Separate component for node item to avoid hook order issues
interface NodeItemProps {
    node: GraphNode;
    style: React.CSSProperties;
    onNodeClick: (node: GraphNode) => void
}

function NodeItem({ node, style, onNodeClick }: NodeItemProps) {
    const SourceIcon = useIcon(node.data?.type, node.data?.src);

    const handleNodeClik = useCallback(() => {
        onNodeClick(node)
    }, [])


    return (
        <div style={style} className="px-4 pb-2">
            <Card className="h-[55px] hover:shadow-md transition-shadow duration-200 p-0">
                <CardContent className="p-3 h-[55px] flex items-center gap-2 min-w-0">
                    {/* Source Node */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted flex-shrink-0">
                            <SourceIcon className="h-4 w-4" />
                        </div>
                        <button onClick={handleNodeClik} className="font-medium text-sm hover:text-primary hover:underline cursor-pointer text-left max-w-full">
                            <span className="block truncate">
                                {node.data?.label ?? node.id}
                            </span>
                        </button>
                        <CopyButton content={node.data?.label ?? node.id} />
                    </div>
                    <div><Badge variant={"outline"}>{node.data.type}</Badge></div>
                </CardContent>
            </Card>
        </div>
    );
}

type NodesTableProps = {
    nodes: GraphNode[]
}
export default function NodesTable({ nodes }: NodesTableProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedType, setSelectedType] = useState<string>("all");
    const parentRef = useRef<HTMLDivElement>(null);
    const setCurrentNode = useGraphStore(s => s.setCurrentNode)
    // const setOpenNodeEditorModal = useGraphStore(s => s.setOpenNodeEditorModal)

    const onNodeClick = useCallback((node: GraphNode) => {
        setCurrentNode(node)
        // setOpenNodeEditorModal(true)
    }, [setCurrentNode, 
        // setOpenNodeEditorModal
    ])


    // Filter nodes based on search and type
    const filteredNodes = useMemo(() => {
        if (!nodes) return [];

        return nodes.filter((node: GraphNode) => {
            const matchesSearch = searchQuery === "" ||
                node.data?.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                node.data?.label?.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesType = selectedType === "all" ||
                node.data?.type === selectedType ||
                node.data?.type === selectedType;

            return matchesSearch && matchesType;
        });
    }, [nodes, searchQuery, selectedType]);

    // Get unique node types for filter
    const nodeTypes = useMemo(() => {
        if (!nodes) return [];
        const types = new Set<string>();
        nodes.forEach((node: GraphNode) => {
            if (node.data?.type) types.add(node.data.type);
            if (node.data?.type) types.add(node.data.type);
        });
        return Array.from(types).sort();
    }, [nodes]);

    const virtualizer = useVirtualizer({
        count: filteredNodes.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ITEM_HEIGHT,
        overscan: 5,
    });

    if (!nodes || nodes.length === 0) {
        return (
            <div className="w-full pt-18 flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                    <Link className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div>
                        <h3 className="text-lg font-semibold">No nodes found</h3>
                        <p className="text-muted-foreground">This sketch doesn't have any nodes yet.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full grow flex flex-col pt-18 space-y-4 p-4 px-6">
            {/* Header with stats */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Entities</h2>
                    <p className="text-muted-foreground">
                        {filteredNodes.length} of {nodes.length} nodes
                    </p>
                </div>
                <Badge variant="secondary" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {nodes.length} total
                </Badge>
            </div>

            {/* Search and Filter */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search nodes, nodes, or types..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-48">
                        <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {nodeTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                                <span className="capitalize">{type}</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Virtualized List */}
            <div
                ref={parentRef}
                className="grow overflow-auto py-4 rounded-lg border"
            >
                <div
                    style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                    className="space-y-2"
                >
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                        const node = filteredNodes[virtualRow.index];

                        return (
                            <NodeItem
                                key={virtualRow.index}
                                node={node}
                                onNodeClick={onNodeClick}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}