import React, { memo, useCallback, useState } from 'react';
import { transformService } from '@/api/transfrom-service';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileCode2, Search, Info, Star } from 'lucide-react';
import { Transform } from '@/types';
import { GraphNode } from '@/stores/graph-store';
import { useLaunchTransform } from '@/hooks/use-launch-transform';
import { useParams } from '@tanstack/react-router';
import { capitalizeFirstLetter, cn } from '@/lib/utils';
import NodeActions from '../../node-actions';

export default function ContextMenu({
    node,
    top,
    left,
    right,
    bottom,
    wrapperWidth,
    wrapperHeight,
    onEdit,
    onDelete,
    setMenu,
    ...props
}: {
    node: GraphNode;
    top: number;
    left: number;
    right: number;
    bottom: number;
    wrapperWidth: number;
    wrapperHeight: number;
    onEdit?: () => void;
    onDelete?: () => void;
    setMenu: (menu: any | null) => void;
    [key: string]: any;
}) {
    const { id: sketchId } = useParams({ strict: false })
    const [searchQuery, setSearchQuery] = useState('');
    const { launchTransform } = useLaunchTransform(false);

    const { data: transforms, isLoading } = useQuery({
        queryKey: ["transforms", node.data.type],
        queryFn: () => transformService.get(capitalizeFirstLetter(node.data.type)),
    });

    const filteredTransforms = transforms?.filter((transform: Transform) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase().trim();
        const matchesName = transform.name?.toLowerCase().includes(query);
        const matchesDescription = transform.description?.toLowerCase().includes(query);
        return matchesName || matchesDescription;
    }) || [];

    // Calculate dynamic dimensions based on available space
    const maxWidth = 320; // Default width (w-80)
    const maxHeight = 500; // Default height (h-96)
    const minWidth = 280; // Minimum width
    const minHeight = 200; // Minimum height

    // Calculate available space based on menu position and wrapper dimensions
    let availableWidth = maxWidth;
    let availableHeight = maxHeight;

    if (left > 0) {
        // Menu is positioned from left, so available width is from left to right edge
        availableWidth = wrapperWidth - left - 20; // 20px padding from right edge
    } else if (right > 0) {
        // Menu is positioned from right, so available width is from left edge to right position
        availableWidth = wrapperWidth - right - 20; // 20px padding from left edge
    }

    if (top > 0) {
        // Menu is positioned from top, so available height is from top to bottom edge
        availableHeight = wrapperHeight - top - 20; // 20px padding from bottom edge
    } else if (bottom > 0) {
        // Menu is positioned from bottom, so available height is from top edge to bottom position
        availableHeight = wrapperHeight - bottom - 20; // 20px padding from top edge
    }

    // Determine dynamic dimensions
    const dynamicWidth = Math.min(maxWidth, Math.max(minWidth, availableWidth));
    const dynamicHeight = Math.min(maxHeight, Math.max(minHeight, availableHeight));

    // Calculate dynamic styles
    const dynamicStyles = {
        width: `${dynamicWidth}px`,
        maxHeight: `${dynamicHeight}px`,
        top: top > 0 ? `${top}px` : 'auto',
        left: left > 0 ? `${left}px` : 'auto',
        right: right > 0 ? `${right}px` : 'auto',
        bottom: bottom > 0 ? `${bottom}px` : 'auto',
    };

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const handleTransformClick = (e: React.MouseEvent, transformId: string) => {
        e.stopPropagation();
        launchTransform([node.data.label], transformId, sketchId)
        setMenu(null)
    };

    return (
        <div
            style={dynamicStyles}
            className="bg-background/90 backdrop-blur-sm border border-border flex flex-col rounded-lg shadow-lg absolute z-50"
            onClick={handleMenuClick}
            {...props}
        >
            {/* Header with title and action buttons */}
            <div className="px-3 py-2 border-b gap-1 border-border flex items-center justify-between flex-shrink-0">
                <div className='flex text-xs items-center gap-1 truncate'>
                    <span className='block truncate'>{node.data.label}</span> - <span className='block'>{node.data.type}</span>
                </div>
                <NodeActions node={node} setMenu={setMenu} />
            </div>

            {/* Search bar */}
            <div className="px-3 py-2 border-b border-border flex-shrink-0">
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
            <div className="flex-1 overflow-auto min-h-0">
                {isLoading ? (
                    <div className="p-2 space-y-2">
                        {[...Array(3)].map((_, i) => (
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
                                    <FavoriteButton isFavorite={false} />
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


const FavoriteButton = memo(({ isFavorite }: { isFavorite: boolean }) => {
    const [favorite, seFavorite] = useState(isFavorite);

    const handleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        seFavorite(!favorite);
    }, [favorite]);

    return (
        <Button onClick={handleClick} className='w-5 h-5' variant='ghost' size={"icon"}>
            <Star fill={favorite ? 'yellow' : 'none'} className={cn('w-4 h-4 opacity-50', favorite && 'text-yellow-500 opacity-100')} strokeWidth={1.5} />
        </Button>
    )
})