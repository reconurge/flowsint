import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { sketchService } from "@/api/sketch-service";
import { GraphNode } from "@/stores/graph-store";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ArrowRight, Users, Link, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIcon } from "@/hooks/use-icon";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export type RelationshipType = {
    source: GraphNode
    target: GraphNode
    edge: { label: string }
}

const ITEM_HEIGHT = 76; // Balanced spacing between items

// Separate component for relationship item to avoid hook order issues
interface RelationshipItemProps {
    relationship: RelationshipType;
    style: React.CSSProperties;
}

function RelationshipItem({ relationship, style }: RelationshipItemProps) {
    const SourceIcon = useIcon(relationship.source.data?.type, relationship.source.data?.src);
    const TargetIcon = useIcon(relationship.target.data?.type, relationship.target.data?.src);

    return (
        <div style={style} className="px-4 pb-2">
            <Card className="h-[64px] hover:shadow-md transition-shadow duration-200 p-0">
                <CardContent className="p-3 h-[64px] flex items-center gap-2 min-w-0">
                    {/* Source Node */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted flex-shrink-0">
                            <SourceIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm">
                                {relationship.source.data?.label || relationship.source.id}
                            </p>
                            <Badge variant="outline" className="text-xs truncate max-w-full">
                                <span className="truncate">
                                    {relationship.source.data?.type || 'unknown'}
                                </span>
                            </Badge>
                        </div>
                    </div>

                    {/* Relationship Arrow */}
                    <div className="flex items-center gap-2 px-2 flex-shrink-0 min-w-0 max-w-[200px]">
                        <div className="flex items-center gap-2 bg-muted/50 px-2 py-1 rounded-full min-w-0">
                            <Badge variant="secondary" className="text-xs font-medium truncate max-w-[120px]">
                                <span className="truncate">
                                    {relationship.edge.label}
                                </span>
                            </Badge>
                            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                    </div>

                    {/* Target Node */}
                    <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                        <div className="flex-1 min-w-0 text-right">
                            <p className="font-medium truncate text-sm">
                                {relationship.target.data?.label || relationship.target.id}
                            </p>
                            <Badge variant="outline" className="text-xs truncate max-w-full">
                                <span className="truncate">
                                    {relationship.target.data?.type || 'unknown'}
                                </span>
                            </Badge>
                        </div>
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted flex-shrink-0">
                            <TargetIcon className="h-4 w-4" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function RelationshipsTable() {
    const { id: sketchId } = useParams({ from: "/_auth/dashboard/investigations/$investigationId/$type/$id" })
    const { data: relationships, isLoading } = useQuery({
        queryKey: ["graph", 'relationships_view', sketchId],
        enabled: Boolean(sketchId),
        queryFn: () => sketchService.getGraphDataById(sketchId as string, true),
    });

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedType, setSelectedType] = useState<string>("all");
    const parentRef = useRef<HTMLDivElement>(null);

    // Filter relationships based on search and type
    const filteredRelationships = useMemo(() => {
        if (!relationships) return [];

        return relationships.filter((rel: RelationshipType) => {
            const matchesSearch = searchQuery === "" ||
                rel.source.data?.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                rel.target.data?.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                rel.edge.label?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesType = selectedType === "all" ||
                rel.source.data?.type === selectedType ||
                rel.target.data?.type === selectedType;

            return matchesSearch && matchesType;
        });
    }, [relationships, searchQuery, selectedType]);

    // Get unique node types for filter
    const nodeTypes = useMemo(() => {
        if (!relationships) return [];
        const types = new Set<string>();
        relationships.forEach((rel: RelationshipType) => {
            if (rel.source.data?.type) types.add(rel.source.data.type);
            if (rel.target.data?.type) types.add(rel.target.data.type);
        });
        return Array.from(types).sort();
    }, [relationships]);

    const virtualizer = useVirtualizer({
        count: filteredRelationships.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ITEM_HEIGHT,
        overscan: 5,
    });

    if (isLoading) {
        return (
            <div className="w-full pt-18 space-y-4 p-12">
                {/* Header with stats */}
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight">Relationships</h2>
                        <p className="text-muted-foreground">
                            <Skeleton className="h-4 w-32 inline-block" />
                        </p>
                    </div>
                    <Badge variant="secondary" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <Skeleton className="h-4 w-8" />
                    </Badge>
                </div>

                {/* Search and Filter */}
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search relationships, nodes, or types..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                            disabled
                        />
                    </div>
                    <Select value={selectedType} onValueChange={setSelectedType} disabled>
                        <SelectTrigger className="w-48">
                            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Skeleton List */}
                <div className="grow overflow-auto py-4 rounded-lg border">
                    <div className="space-y-2 px-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-[64px] w-full" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!relationships || relationships.length === 0) {
        return (
            <div className="w-full pt-18 flex items-center justify-center h-96">
                <div className="text-center space-y-4">
                    <Link className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div>
                        <h3 className="text-lg font-semibold">No relationships found</h3>
                        <p className="text-muted-foreground">This sketch doesn't have any relationships yet.</p>
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
                    <h2 className="text-2xl font-bold tracking-tight">Relationships</h2>
                    <p className="text-muted-foreground">
                        {filteredRelationships.length} of {relationships.length} relationships
                    </p>
                </div>
                <Badge variant="secondary" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {relationships.length} total
                </Badge>
            </div>

            {/* Search and Filter */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search relationships, nodes, or types..."
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
                        const relationship = filteredRelationships[virtualRow.index];

                        return (
                            <RelationshipItem
                                key={virtualRow.index}
                                relationship={relationship}
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