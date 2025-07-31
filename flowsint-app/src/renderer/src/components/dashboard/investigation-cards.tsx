import { useQuery } from "@tanstack/react-query";
import { investigationService } from "@/api/investigation-service";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, Plus, Clock, FileText, BarChart3 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import NewInvestigation from "@/components/investigations/new-investigation";

interface InvestigationCardProps {
    investigation: any;
}

function InvestigationCard({ investigation }: InvestigationCardProps) {
    const sketchCount = investigation.sketches?.length || 0;
    const analysisCount = investigation.analyses?.length || 0;
    const totalItems = sketchCount + analysisCount;
    
    return (
        <Link
            to="/dashboard/investigations/$investigationId"
            params={{ investigationId: investigation.id }}
            className="block"
        >
            <Card className="hover:shadow-lg py-4 transition-all duration-200 cursor-pointer group border-2 hover:border-primary/20">
                <CardContent className="h-full flex flex-col">
                    {/* Header with title and count */}
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FolderOpen className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                                    {investigation.name}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    {totalItems} items
                                </p>
                            </div>
                        </div>
                        <Badge variant="secondary" className="text-xs flex-shrink-0 ml-2">
                            {totalItems}
                        </Badge>
                    </div>
                    
                    {/* Stats row */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />
                            <span>{sketchCount} graphs</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span>{analysisCount} docs</span>
                        </div>
                    </div>
                    
                    {/* Footer with timestamp */}
                    <div className="mt-auto">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>
                                Updated {formatDistanceToNow(new Date(investigation.last_updated_at), { addSuffix: true })}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

function InvestigationCardsSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6" />
                    <Skeleton className="h-6 w-48" />
                </div>
                <Skeleton className="h-8 w-24" />
            </div>
            <div className="grid grid-cols-1 cq-sm:grid-cols-2 cq-md:grid-cols-3 cq-lg:grid-cols-4 cq-xl:grid-cols-5 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i} className="w-full">
                                                    <CardContent className="p-4 h-full flex flex-col">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="w-8 h-8 rounded-lg" />
                                    <div className="flex-1">
                                        <Skeleton className="h-4 w-32 mb-1" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </div>
                                <Skeleton className="h-5 w-8" />
                            </div>
                            <div className="flex gap-4 mb-3">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                            <div className="mt-auto">
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

export function InvestigationCards() {
    const { data: investigations, isLoading } = useQuery({
        queryKey: ["investigations", "dashboard"],
        queryFn: investigationService.get,
        staleTime: 30000, // 30 seconds
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });

    if (isLoading) {
        return <InvestigationCardsSkeleton />;
    }

    if (!investigations || investigations.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FolderOpen className="h-6 w-6 text-muted-foreground" />
                        <h2 className="text-xl font-semibold">Investigations</h2>
                    </div>
                    <NewInvestigation noDropDown>
                        <Button size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            New Investigation
                        </Button>
                    </NewInvestigation>
                </div>
                <div className="text-center py-12">
                    <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No investigations yet</h3>
                    <p className="text-muted-foreground mb-4">
                        Create your first investigation to start organizing your data.
                    </p>
                    <NewInvestigation noDropDown>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Investigation
                        </Button>
                    </NewInvestigation>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FolderOpen className="h-6 w-6 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">Investigations</h2>
                    <span className="text-sm text-muted-foreground">
                        {investigations.length} investigations
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <NewInvestigation noDropDown>
                        <Button size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            New Investigation
                        </Button>
                    </NewInvestigation>
                </div>
            </div>
            
            <div className="grid grid-cols-1 cq-sm:grid-cols-2 cq-md:grid-cols-3 cq-lg:grid-cols-4 cq-xl:grid-cols-5 gap-4">
                {investigations.slice(0, 8).map((investigation: any) => (
                    <InvestigationCard key={investigation.id} investigation={investigation} />
                ))}
            </div>
        </div>
    );
} 