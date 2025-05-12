import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AlertCircle } from "lucide-react"

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-md mx-auto text-center space-y-6">
                {/* Icon */}
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-muted-foreground" />
                </div>

                {/* Error code */}
                <h1 className="text-4xl font-bold text-foreground">404</h1>

                {/* Error message */}
                <div className="space-y-2">
                    <h2 className="text-xl font-medium text-foreground">Page not found</h2>
                    <p className="text-muted-foreground">The page you are looking for doesn't exist or has been moved.</p>
                </div>

                {/* Action button */}
                <div className="pt-4">
                    <Button asChild variant="default" className="gap-2">
                        <Link href="/">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Home
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
