"use client"

import { useEffect, useState } from "react"
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    ExternalLink,
    Grid2X2,
    LayoutList,
    Search,
    Shield,
    ShieldAlert,
    XCircle,
} from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useQueryState } from "nuqs"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import Loader from "../loader"
import { format } from 'date-fns';


export type ScanResult = {
    name: string
    domain: string
    exists: boolean
    method: string
    others: any
    rateLimit: boolean
    phoneNumber: string | null
    emailrecovery: string | null
    frequent_rate_limit: boolean
}

export type ErrorResult = {
    error: string
}

export type Scan = {
    id: string
    value: string,
    status: "pending" | "finished" | "error"
    results: {
        results: (ScanResult | ErrorResult)[]
    }
    created_at: string
}

export function ScanDrawer() {
    const { project_id, investigation_id } = useParams()
    const [scanId, setScanId] = useQueryState("scan_id")
    const [open, setOpen] = useState(Boolean(scanId))
    const [searchQuery, setSearchQuery] = useState("")
    const [viewMode, setViewMode] = useState<"grid" | "table">("table")

    const { data: currentScan = null, isLoading } = useQuery({
        queryKey: ["projects", project_id, "investigations", investigation_id, "scans", scanId],
        queryFn: async (): Promise<Scan | null> => {
            const res = await fetch(`/api/projects/${project_id}/investigations/${investigation_id}/scans/${scanId}`)
            if (!res.ok) {
                return null
            }
            return res.json()
        },
        enabled: !!scanId,
        refetchOnWindowFocus: true,
    })

    useEffect(() => {
        if (Boolean(scanId)) setOpen(true)
    }, [scanId])

    useEffect(() => {
        if (!open) setScanId(null)
    }, [open])

    const isErrorResult = (result: ScanResult | ErrorResult): result is ErrorResult => {
        return "error" in result
    }

    const filteredResults = currentScan?.results ? currentScan?.results?.results.filter((result: any) => {
        if (isErrorResult(result)) {
            return result.error.toLowerCase().includes(searchQuery.toLowerCase())
        }
        return (
            result.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            result.domain.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }) : null

    const stats = currentScan?.results ? currentScan?.results.results.reduce(
        (acc: any, result: any) => {
            if (isErrorResult(result)) {
                acc.errors++
            } else {
                if (result.exists) acc.exists++
                if (result.rateLimit) acc.rateLimited++
            }
            return acc
        },
        { exists: 0, rateLimited: 0, errors: 0 },
    ) : null

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerContent className="h-[90vh] !max-h-none border">
                {isLoading &&
                    <DrawerHeader className="border-b pb-4 p-4">
                        <DrawerTitle className="flex items-center gap-2 mb-2">
                            Scan Results
                            <Badge variant={currentScan?.status === "error" ? "destructive" : "outline"}>{currentScan?.status}</Badge>
                        </DrawerTitle>
                        <p className="opacity-60 mb-2 mt-2">{currentScan?.value}</p>
                        <div className="h-[400px] w-full flex items-center justify-center gap-1"><Loader /> Loading results...</div>
                    </DrawerHeader>}
                {!isLoading && stats && filteredResults ?
                    <>
                        <DrawerHeader className="border-b pb-4 p-4">
                            <DrawerTitle className="flex items-center gap-2 mb-2">
                                Scan Results  <span className="font-normal">({format(new Date(currentScan?.created_at as string), 'dd MMMM, HH:mm')})</span>
                                <Badge variant={currentScan?.status === "error" ? "destructive" : "outline"}>{currentScan?.status}</Badge>
                            </DrawerTitle>
                            <p className="opacity-60 mb-2 mt-2">{currentScan?.value}</p>
                            {/* Stats Cards */}

                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <Card className="bg-accent shadow-none">
                                    <CardContent className="p-4 flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-green-500" />
                                        <div>
                                            <p className="text-sm font-medium">Existing Accounts</p>
                                            <p className="text-2xl font-bold">{stats?.exists || 0}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-accent shadow-none">
                                    <CardContent className="p-4 flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-yellow-500" />
                                        <div>
                                            <p className="text-sm font-medium">Rate Limited</p>
                                            <p className="text-2xl font-bold">{stats?.rateLimited || 0}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-accent shadow-none">
                                    <CardContent className="p-4 flex items-center gap-2">
                                        <ShieldAlert className="h-4 w-4 text-destructive" />
                                        <div>
                                            <p className="text-sm font-medium">Errors</p>
                                            <p className="text-2xl font-bold">{stats?.errors || 0}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                            {/* Search and View Toggle */}
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search services..."
                                        className="pl-8 shadow-none"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === "grid" ? "table" : "grid")}>
                                    {viewMode === "grid" ? <LayoutList className="h-4 w-4" /> : <Grid2X2 className="h-4 w-4" />}
                                </Button>
                            </div>
                        </DrawerHeader>
                        <div className="h-auto overflow-auto">
                            {viewMode === "table" ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Service</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Method</TableHead>
                                            <TableHead>Details</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredResults?.map((result: any, index: number) => (
                                            <TableRow key={index}>
                                                {isErrorResult(result) ? (
                                                    <>
                                                        <TableCell className="font-medium dark:text-red-400 text-destructive px-4"><div>Error</div></TableCell>
                                                        <TableCell colSpan={3} className="dark:text-red-400 text-destructive">
                                                            {result.error}
                                                        </TableCell>
                                                    </>
                                                ) : (
                                                    <>
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-2 px-2">
                                                                {result.name}
                                                                <a
                                                                    href={`https://${result.domain}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-muted-foreground hover:text-primary"
                                                                >
                                                                    <ExternalLink className="h-4 w-4" />
                                                                </a>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                {result.exists ? (
                                                                    <Badge className="text-green-500 bg-green-400/10 border border-green-500/30">
                                                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                        Exists
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="secondary">
                                                                        <XCircle className="h-3 w-3 mr-1" />
                                                                        Not Found
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{result.method}</TableCell>
                                                        <TableCell>
                                                            <div className="flex gap-2">
                                                                {result.rateLimit && (
                                                                    <Badge variant="destructive" className="text-yellow-500 bg-yellow-400/10 border border-yellow-500/30">
                                                                        Rate Limited
                                                                    </Badge>
                                                                )}
                                                                {result.frequent_rate_limit && (
                                                                    <Badge variant="destructive" className="text-orange-500 bg-orange-400/10 border border-orange-500/30">
                                                                        Frequent Limits
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 overflow-auto">
                                    {filteredResults?.map((result: any, index: number) => (
                                        <Card key={index} className="overflow-hidden bg-accent">
                                            <CardContent className="p-4">
                                                {isErrorResult(result) ? (
                                                    <div className="flex items-start gap-2 text-destructive">
                                                        <AlertCircle className="h-4 w-4 mt-1" />
                                                        <div>
                                                            <p className="font-medium">Error</p>
                                                            <p className="text-sm">{result.error}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2 font-medium">
                                                                {result.name}
                                                                <a
                                                                    href={`https://${result.domain}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-muted-foreground hover:text-primary"
                                                                >
                                                                    <ExternalLink className="h-4 w-4" />
                                                                </a>
                                                            </div>
                                                            {result.exists ? (
                                                                <Badge className="bg-green-500">
                                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                    Exists
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary">
                                                                    <XCircle className="h-3 w-3 mr-1" />
                                                                    Not Found
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">Method: {result.method}</div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {result.rateLimit && (
                                                                <Badge variant="destructive" className="bg-yellow-500">
                                                                    Rate Limited
                                                                </Badge>
                                                            )}
                                                            {result.frequent_rate_limit && (
                                                                <Badge variant="destructive" className="bg-orange-500">
                                                                    Frequent Limits
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </> : !isLoading && <div><DrawerHeader className="border-b pb-4 p-4">
                        <DrawerTitle className="flex items-center gap-2 mb-2">
                            Scan Results
                            <Badge variant={currentScan?.status === "error" ? "destructive" : "outline"}>{currentScan?.status}</Badge>
                        </DrawerTitle>
                        <p className="opacity-60 mb-2 mt-2">{currentScan?.value}</p>
                        <div>Results are not there yet. They should appear soon.</div>
                    </DrawerHeader>
                    </div>}
            </DrawerContent>
        </Drawer>
    )
}

