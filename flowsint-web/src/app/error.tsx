"use client"

import { useEffect } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="w-full max-w-md border-destructive/50 shadow-lg">
        <CardHeader className="flex flex-row items-center gap-2 border-b pb-4">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <h2 className="text-xl font-semibold">Une erreur est survenue</h2>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Nous sommes désolés, mais quelque chose s'est mal passé lors du chargement de cette page.
            </p>
            {error.digest && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm font-mono">Code d'erreur: {error.digest}</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 pt-2">
          <Button onClick={() => reset()} className="group flex items-center gap-2" variant="default">
            <RefreshCw className="h-4 w-4 transition-transform group-hover:rotate-180" />
            Réessayer
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

