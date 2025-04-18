"use client"

import { memo, useEffect, useState } from "react"
import {
    AlertCircle,
    BookOpen,
    CheckCircle2,
    Clock,
    Code,
    ExternalLink,
    GamepadIcon,
    GithubIcon,
    Globe,
    Grid2X2,
    ImageIcon,
    LayoutList,
    MessageSquare,
    Search,
    Shield,
    ShieldAlert,
    Users,
    XCircle,
} from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useQueryState } from "nuqs"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import Loader from "../loader"
import { CopyButton } from "../copy"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn, getInitials } from "@/lib/utils"

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
    value: string
    status: "pending" | "finished" | "error"
    results: any
    created_at: string
    scan_name: string
}

export function ScanDrawer() {
    const { investigation_id, sketch_id } = useParams()
    const [scanId, setScanId] = useQueryState("scan_id")
    const [open, setOpen] = useState(Boolean(scanId))
    const [searchQuery, setSearchQuery] = useState("")
    const [viewMode, setViewMode] = useState<"grid" | "table">("table")

    const { data: currentScan = null, isLoading } = useQuery({
        queryKey: ["projects", investigation_id, "investigations", sketch_id, "scans", scanId],
        queryFn: async (): Promise<Scan | null> => {
            const res = await fetch(`/api/investigations/${investigation_id}/sketches/${sketch_id}/scans/${scanId}`)
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

    // Déterminer le type de format des résultats
    const detectScanFormat = (scan: Scan | null) => {
        if (!scan || !scan.results) return "unknown"

        // Format holehe_scanner
        if (
            scan.scan_name === "holehe_scanner" &&
            scan.results.results &&
            Array.isArray(scan.results.results) &&
            scan.results.results.length > 0 &&
            (scan.results.results[0].name || scan.results.results[0].error)
        ) {
            return "holehe"
        }

        // Format Maigret
        if (
            scan.results.count !== undefined &&
            scan.results.results &&
            scan.results.username &&
            scan.results.scanner === "maigret"
        ) {
            return "maigret"
        }

        // Format par défaut (raw)
        return "raw"
    }

    const scanFormat = currentScan ? detectScanFormat(currentScan) : "unknown"

    const isErrorResult = (result: ScanResult | ErrorResult): result is ErrorResult => {
        return "error" in result
    }

    const HoleheDrawer = memo(() => {
        if (!currentScan || !currentScan.results || !currentScan.results.results) {
            return <div className="p-4">No results available</div>
        }

        const filteredResults = currentScan.results.results.filter((result: any) => {
            if (isErrorResult(result)) {
                return result.error.toLowerCase().includes(searchQuery.toLowerCase())
            }
            return (
                result.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                result.domain.toLowerCase().includes(searchQuery.toLowerCase())
            )
        })

        const stats = currentScan.results.results.reduce(
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
        )

        return (
            <>
                <DrawerHeader className="border-b pb-4 p-4">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <Card className="bg-background shadow-none">
                            <CardContent className="p-4 flex items-center gap-2">
                                <Shield className="h-4 w-4 text-green-500" />
                                <div>
                                    <p className="text-sm font-medium">Existing Accounts</p>
                                    <p className="text-2xl font-bold">{stats?.exists || 0}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-background shadow-none">
                            <CardContent className="p-4 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-yellow-500" />
                                <div>
                                    <p className="text-sm font-medium">Rate Limited</p>
                                    <p className="text-2xl font-bold">{stats?.rateLimited || 0}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-background shadow-none">
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
                                                <TableCell className="font-medium dark:text-red-400 text-destructive px-4">
                                                    <div>Error</div>
                                                </TableCell>
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
                                                            <Badge
                                                                variant="destructive"
                                                                className="text-yellow-500 bg-yellow-400/10 border border-yellow-500/30"
                                                            >
                                                                Rate Limited
                                                            </Badge>
                                                        )}
                                                        {result.frequent_rate_limit && (
                                                            <Badge
                                                                variant="destructive"
                                                                className="text-orange-500 bg-orange-400/10 border border-orange-500/30"
                                                            >
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
                                <Card key={index} className="overflow-hidden bg-background">
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
            </>
        )
    })

    const MaigretDrawer = memo(() => {
        if (!currentScan || !currentScan.results) {
            return <div className="p-4">No results available</div>
        }

        const userData = currentScan.results
        const platforms = userData.results || {}

        // Filtrer les plateformes en fonction de la recherche
        const filteredPlatforms = Object.entries(platforms).filter(([key, value]) => {
            const platform = value as any
            return (
                key.toLowerCase().includes(searchQuery.toLowerCase()) ||
                platform.status?.site_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                platform.status?.url?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        })

        // Obtenir l'image de profil GitHub si disponible
        const githubData = platforms.GitHub
        const profileImage = githubData?.status?.ids?.image || "/placeholder.svg?height=100&width=100"

        // Fonction pour obtenir l'icône appropriée en fonction des tags
        const getIcon = (tags: string[]) => {
            if (tags.includes("coding")) return <Code className="h-5 w-5" />
            if (tags.includes("photo")) return <ImageIcon className="h-5 w-5" />
            if (tags.includes("forum")) return <MessageSquare className="h-5 w-5" />
            if (tags.includes("blog")) return <BookOpen className="h-5 w-5" />
            if (tags.includes("gaming")) return <GamepadIcon className="h-5 w-5" />
            if (tags.includes("social")) return <Users className="h-5 w-5" />
            return <Globe className="h-5 w-5" />
        }

        // Calculer les statistiques
        const stats = {
            total: Object.keys(platforms).length,
            coding: Object.values(platforms).filter((p: any) => p.status?.tags?.includes("coding")).length,
            social: Object.values(platforms).filter(
                (p: any) =>
                    p.status?.tags?.includes("photo") || p.status?.tags?.includes("blog") || p.status?.tags?.includes("social"),
            ).length,
            gaming: Object.values(platforms).filter((p: any) => p.status?.tags?.includes("gaming")).length,
        }

        return (
            <>
                <DrawerHeader className="border-b pb-4 p-4">
                    <div className="flex items-center gap-4 mb-4">
                        <Avatar
                            className={cn(
                                "border-2 h-16 w-16 border-card bg-background relative",
                                "transition-transform",
                                "ring-0 ring-offset-0",
                            )}
                        >
                            <AvatarImage src={profileImage} alt={userData.username} />
                            <AvatarFallback className={cn("text-md", "bg-muted")}>{getInitials(userData.username)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="text-xl font-bold">@{userData.username}</h3>
                            <p className="text-muted-foreground">Trouvé sur {Object.keys(platforms).length} plateformes</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                        <Card className="bg-background shadow-none">
                            <CardContent className="p-3 flex items-center gap-2">
                                <Globe className="h-4 w-4 text-primary" />
                                <div>
                                    <p className="text-xs font-medium">Total</p>
                                    <p className="text-lg font-bold">{stats.total}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-background shadow-none">
                            <CardContent className="p-3 flex items-center gap-2">
                                <Code className="h-4 w-4 text-green-500" />
                                <div>
                                    <p className="text-xs font-medium">Dev</p>
                                    <p className="text-lg font-bold">{stats.coding}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-background shadow-none">
                            <CardContent className="p-3 flex items-center gap-2">
                                <Users className="h-4 w-4 text-blue-500" />
                                <div>
                                    <p className="text-xs font-medium">Social</p>
                                    <p className="text-lg font-bold">{stats.social}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-background shadow-none">
                            <CardContent className="p-3 flex items-center gap-2">
                                <GamepadIcon className="h-4 w-4 text-purple-500" />
                                <div>
                                    <p className="text-xs font-medium">Gaming</p>
                                    <p className="text-lg font-bold">{stats.gaming}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    {/* Search and View Toggle */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher des plateformes..."
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
                                    <TableHead>Plateforme</TableHead>
                                    <TableHead>Rang</TableHead>
                                    <TableHead>Tags</TableHead>
                                    <TableHead>URL</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPlatforms.map(([key, value], index) => {
                                    const platform = value as any
                                    return (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                                        {platform.status.site_name === "GitHub" ? (
                                                            <GithubIcon className="h-4 w-4" />
                                                        ) : (
                                                            getIcon(platform.status.tags || [])
                                                        )}
                                                    </div>
                                                    {platform.status.site_name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{platform.rank || "N/A"}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {(platform.status.tags || []).map((tag: string, tagIndex: number) => (
                                                        <Badge key={tagIndex} variant="secondary" className="text-xs">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <a
                                                    href={platform.status.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline flex items-center gap-1"
                                                >
                                                    <span className="truncate max-w-[200px]">{platform.status.url}</span>
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-auto">
                            {filteredPlatforms.map(([key, value], index) => {
                                const platform = value as any
                                return (
                                    <Card key={index} className="overflow-hidden bg-background">
                                        <CardContent className="p-4">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                                            {platform.status.site_name === "GitHub" ? (
                                                                <GithubIcon className="h-5 w-5" />
                                                            ) : (
                                                                getIcon(platform.status.tags || [])
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-medium">{platform.status.site_name}</h3>
                                                            <p className="text-xs text-muted-foreground">@{platform.status.username}</p>
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline">Rank: {platform.rank || "N/A"}</Badge>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {(platform.status.tags || []).map((tag: string, tagIndex: number) => (
                                                        <Badge key={tagIndex} variant="secondary" className="text-xs">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                                <a
                                                    href={platform.status.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline flex items-center gap-1 text-sm"
                                                >
                                                    <span className="truncate">{platform.status.url}</span>
                                                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                                </a>
                                                {platform.status.site_name === "GitHub" && platform.status.ids && (
                                                    <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 mt-2 pt-2 border-t">
                                                        <div>Dépôts: {platform.status.ids.public_repos_count}</div>
                                                        <div>Gists: {platform.status.ids.public_gists_count}</div>
                                                        <div>Abonnés: {platform.status.ids.follower_count}</div>
                                                        <div>Abonnements: {platform.status.ids.following_count}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </div>
            </>
        )
    })

    const RawResults = memo(() => (
        <div className="p-4">
            <div className="relative">
                <pre className="overflow-auto max-h-[500px] rounded-md p-3 border">
                    <code>{JSON.stringify(currentScan?.results, null, 2)}</code>
                    <div className="absolute top-2 right-2">
                        <CopyButton content={JSON.stringify(currentScan?.results)} />
                    </div>
                </pre>
            </div>
        </div>
    ))

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerContent className="h-[90vh] !max-h-none border flex flex-col">
                {isLoading ? (
                    <DrawerHeader className="border-b pb-4 p-4">
                        <DrawerTitle className="flex items-center gap-2 mb-2">
                            Scan Results
                            <Badge variant={currentScan?.status === "error" ? "destructive" : "outline"}>{currentScan?.status}</Badge>
                        </DrawerTitle>
                        <p className="opacity-60 mb-2 mt-2">{currentScan?.value}</p>
                        <div className="h-[400px] w-full flex items-center justify-center gap-1">
                            <Loader /> Loading results...
                        </div>
                    </DrawerHeader>
                ) : (
                    <>
                        <DrawerHeader className="border-b pb-4 p-4">
                            <DrawerTitle className="flex items-center gap-2 mb-2">
                                Scan Results
                                <Badge variant={currentScan?.status === "error" ? "destructive" : "outline"}>
                                    {currentScan?.status}
                                </Badge>
                            </DrawerTitle>
                            <p className="opacity-60 mb-2 mt-2">{currentScan?.value}</p>
                        </DrawerHeader>
                        {currentScan?.status === "pending" ? (
                            <div className="p-4">
                                <div>Results are not there yet. They should appear soon.</div>
                            </div>
                        ) : scanFormat === "holehe" ? (
                            <HoleheDrawer />
                        ) : scanFormat === "maigret" ? (
                            <MaigretDrawer />
                        ) : (
                            <RawResults />
                        )}
                    </>
                )}
            </DrawerContent>
        </Drawer>
    )
}
