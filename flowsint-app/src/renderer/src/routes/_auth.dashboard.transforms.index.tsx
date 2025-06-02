import { createFileRoute } from '@tanstack/react-router'
import { transformService } from '@/api/transfrom-service'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { PlusIcon, FileCode2, Clock } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { SkeletonList } from '@/components/shared/skeleton-list'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Transform {
    id: string
    name: string
    description?: string
    category?: string[]
    created_at: string
    updated_at?: string
    transform_schema?: any
}

export const Route = createFileRoute('/_auth/dashboard/transforms/')({
    component: TransformsPage,
})

function TransformsPage() {
    const navigate = useNavigate()
    const { data: transforms, isLoading, refetch } = useQuery<Transform[]>({
        queryKey: ["transforms"],
        queryFn: () => transformService.get(),
    })

    const handleCreateTransform = async () => {
        toast.promise(
            (async () => {
                const response = await transformService.create(JSON.stringify({
                    name: "New Transform",
                    description: "A new transform",
                    category: [],
                    transform_schema: {}
                }))
                refetch()
                navigate({ to: `/dashboard/transforms/${response.id}` })
                return response
            })(),
            {
                loading: 'Creating transform...',
                success: 'Transform created successfully.',
                error: 'Failed to create transform.'
            }
        )
    }

    // Get all unique categories
    const categories = transforms?.reduce((acc: string[], transform) => {
        if (transform.category) {
            transform.category.forEach(cat => {
                if (!acc.includes(cat)) acc.push(cat)
            })
        }
        return acc
    }, []) || []

    // Add "All" and "Uncategorized" to categories
    const allCategories = ['All', ...categories, 'Uncategorized']

    return (
        <div className="h-full w-full overflow-y-auto bg-background">
            <div className="container max-w-6xl mx-auto px-8 py-12">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Transforms</h1>
                        <p className="text-muted-foreground mt-1">
                            Create and manage your data transformation workflows.
                        </p>
                    </div>
                    <Button size="lg" onClick={handleCreateTransform}>
                        <PlusIcon className="w-4 h-4 mr-2" />
                        New Transform
                    </Button>
                </div>

                {isLoading ? (
                    <div className="p-2">
                        <SkeletonList rowCount={7} />
                    </div>
                ) : (
                    <Tabs defaultValue="All" className="space-y-6">
                        <TabsList className="w-full justify-start h-auto p-1 bg-muted/50">
                            {allCategories.map((category) => (
                                <TabsTrigger
                                    key={category}
                                    value={category}
                                    className="data-[state=active]:bg-background"
                                >
                                    {category}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {allCategories.map((category) => (
                            <TabsContent key={category} value={category} className="mt-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {transforms
                                        ?.filter(transform => 
                                            category === 'All' 
                                                ? true 
                                                : category === 'Uncategorized'
                                                    ? !transform.category?.length
                                                    : transform.category?.includes(category)
                                        )
                                        .map((transform) => (
                                            <Card 
                                                key={transform.id} 
                                                className="group hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                                                onClick={() => navigate({ to: `/dashboard/transforms/${transform.id}` })}
                                            >
                                                <CardHeader className="pb-2">
                                                    <div className="flex items-start justify-between">
                                                        <CardTitle className="text-lg font-medium group-hover:text-primary transition-colors">
                                                            {transform.name || "(Unnamed transform)"}
                                                        </CardTitle>
                                                        <FileCode2 className="w-4 h-4 text-muted-foreground" />
                                                    </div>
                                                    <CardDescription className="line-clamp-2 mt-1">
                                                        {transform.description || "No description provided"}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center text-sm text-muted-foreground">
                                                            <Clock className="w-4 h-4 mr-1" />
                                                            {formatDistanceToNow(new Date(transform.updated_at || transform.created_at), { addSuffix: true })}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 justify-end">
                                                            {transform.category?.map((cat) => (
                                                                <Badge key={cat} variant="secondary">
                                                                    {cat}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                )}
            </div>
        </div>
    )
}