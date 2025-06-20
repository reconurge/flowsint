import React, { useState } from 'react';
import { transformService } from '@/api/transfrom-service';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, FileCode2, Search, Info, Star } from 'lucide-react';
import { Transform } from '@/types';
import { GraphNode } from '@/stores/graph-store';
import { useLaunchTransform } from '@/hooks/use-launch-transform';
import { useParams } from '@tanstack/react-router';

export default function ContextMenu({
    node,
    top,
    left,
    right,
    bottom,
    onEdit,
    onDelete,
    ...props
}: {
    node: GraphNode;
    top: number;
    left: number;
    right: number;
    bottom: number;
    onEdit?: () => void;
    onDelete?: () => void;
    [key: string]: any;
}) {
    const { id } = useParams({ strict: false })
    const [searchQuery, setSearchQuery] = useState('');
    const { launchTransform } = useLaunchTransform(false);
    const { data: transforms, isLoading } = useQuery({
        queryKey: ["transforms"],
        queryFn: () => transformService.get(),
    });

    const filteredTransforms = transforms?.filter((transform: Transform) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase().trim();
        const matchesName = transform.name?.toLowerCase().includes(query);
        const matchesDescription = transform.description?.toLowerCase().includes(query);
        return matchesName || matchesDescription;
    }) || [];

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const handleButtonClick = (e: React.MouseEvent, action?: () => void) => {
        e.stopPropagation();
        action?.();
    };

    const handleTransformClick = (e: React.MouseEvent, transformId: string) => {
        e.stopPropagation();
        launchTransform([node.data.label], transformId, id)
    };

    return (
        <div
            style={{ top, left, right, bottom }}
            className="bg-background border border-border flex flex-col rounded-lg shadow-lg absolute z-50 w-80 h-96"
            onClick={handleMenuClick}
            {...props}
        >
            {/* Header with title and action buttons */}
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium truncate flex-1">
                    {node.data.label} - {node.data.type}
                </p>
                <div className="flex items-center  gap-1 ml-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-muted opacity-70 hover:opacity-100"
                        onClick={(e) => handleButtonClick(e, onEdit)}
                    >
                        <Pencil className="h-3 w-3" strokeWidth={1.5} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-muted opacity-70 hover:opacity-100 text-destructive hover:text-destructive"
                        onClick={(e) => handleButtonClick(e, onDelete)}
                    >
                        <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                    </Button>
                </div>
            </div>

            {/* Search bar */}
            <div className="px-3 py-2 border-b border-border">
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search transforms..."
                        value={searchQuery}
                        onChange={(e) => {
                            e.stopPropagation();
                            setSearchQuery(e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-7 pl-7 text-xs"
                    />
                </div>
            </div>

            {/* Transforms list */}
            <div className="flex-1 overflow-auto grow">
                {isLoading ? (
                    <div className="p-2 space-y-2">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 rounded-md">
                                <Skeleton className="h-4 w-4" />
                                <div className="flex-1 space-y-1">
                                    <Skeleton className="h-3 w-3/4" />
                                    <Skeleton className="h-2 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredTransforms.length > 0 ? (
                    <div className="p-1">
                        {filteredTransforms.map((transform: Transform) => (
                            <button
                                key={transform.id}
                                className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left transition-colors"
                                onClick={(e) => handleTransformClick(e, transform.id)}
                            >
                                <FileCode2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {transform.name || "(Unnamed transform)"}
                                    </p>
                                    {transform.description && (
                                        <p className="text-xs text-muted-foreground truncate">
                                            {transform.description}
                                        </p>
                                    )}

                                </div>
                                <div className='flex items-center gap-1'>
                                    <Button className='w-5 h-5' variant='ghost' size={"icon"}>
                                        <Star className='w-4 h-4 opacity-50' strokeWidth={1.5} />
                                    </Button>
                                    <Button className='w-5 h-5' variant='ghost' size={"icon"}>
                                        <Info className='w-4 h-4 opacity-50' strokeWidth={1.5} />
                                    </Button>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">
                            {searchQuery ? 'No transforms found' : 'No transforms available'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
