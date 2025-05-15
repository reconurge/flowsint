import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { PlusCircle, FileCode2 } from "lucide-react"
import Link from "next/link"
import { TransformItem } from "@/components/transforms/transform-item"

const TransformsPage = async () => {
    const supabase = await createClient()
    const { data: transforms } = await supabase.from("transforms").select("*")

    return (
        <div className="w-full space-y-8 container bg-background grow mx-auto py-12 px-8">
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
                    <div className="w-full grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 xl:grid-cols-3 gap-5">
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



export default TransformsPage
