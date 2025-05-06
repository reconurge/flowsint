import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { PlusCircle, FileCode2, ArrowRight, Calendar } from "lucide-react"
import Link from "next/link"

const TransformsPage = async () => {
    const supabase = await createClient()
    const { data: transforms } = await supabase.from("transforms").select("*")

    return (
        <div className="w-full space-y-8 container mx-auto py-12 px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="font-semibold text-2xl">Transforms {transforms?.length ? `(${transforms.length})` : ""}</h1>
                    <p className="text-muted-foreground mt-1">Manage your data transformation workflows</p>
                </div>
                {transforms?.length !== 0 &&
                    <Link href="/dashboard/transforms/editor">
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New transform
                        </Button>
                    </Link>}
            </div>
            {
                !transforms?.length ? (
                    <EmptyState />
                ) : (
                    <div className="w-full grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 xl:grid-cols-4 gap-5">
                        {transforms.map((transform) => (
                            <TransformItem key={transform.id} transform={transform} />
                        ))}
                    </div>
                )
            }
        </div >
    )
}

const EmptyState = () => {
    return (
        <Card className="w-full border border-dashed bg-muted/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-primary/10 p-3 mb-4">
                    <FileCode2 className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-medium text-center mb-2">No transforms yet</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                    Create your first transform to start gathering and processing information from your data sources.
                </p>
                <Link href="/dashboard/transforms/editor">
                    <Button size="lg">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create your first transform
                    </Button>
                </Link>
            </CardContent>
        </Card>
    )
}

const TransformItem = ({ transform }: { transform: any }) => {
    // Format date if available (assuming created_at exists, adjust as needed)
    const formattedDate = transform.created_at
        ? new Date(transform.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        })
        : null

    const stepsCount = transform?.transform_schema?.edges?.length || 0

    return (
        <Link href={`/dashboard/transforms/${transform.id}`} className="block h-full transition-all">
            <Card className="h-full border hover:border-primary/50 hover:shadow-md transition-all">
                <CardHeader className="pb-2 relative">
                    <CardTitle className="text-lg w-full flex items-start justify-between font-medium">
                        <p className=" line-clamp-2">{transform.name}</p>
                        <Badge>{transform.category}</Badge>
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                        {transform.description || "No description provided"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                        <FileCode2 className="h-4 w-4 mr-1" />
                        <span>
                            {stepsCount} {stepsCount === 1 ? "step" : "steps"}
                        </span>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-0">
                    {formattedDate && (
                        <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formattedDate}
                        </div>
                    )}
                    <div className="text-primary text-sm font-medium flex items-center">
                        View details
                        <ArrowRight className="ml-1 h-3 w-3" />
                    </div>
                </CardFooter>
            </Card>
        </Link>
    )
}

export default TransformsPage
