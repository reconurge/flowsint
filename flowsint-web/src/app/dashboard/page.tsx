import Investigation from "@/components/dashboard/investigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, ChevronDown, Clock, Filter, Grid3X3, List, Lock, Plus, Search, Target } from "lucide-react"
import NewCase from "@/components/dashboard/new-case"
import { createClient } from "@/lib/supabase/server"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { unauthorized } from "next/navigation"

const DashboardPage = async () => {
    const supabase = await createClient()
    const { data: investigations, error } = await supabase.from("investigations").select("*, relations_count:relationships!inner(count), individuals_counts:individuals!inner(count)")
    if (error) return unauthorized()

    // Compter les investigations par statut
    const activeCount = investigations.filter((inv) => inv.status === "active").length || 0
    const pendingCount = investigations.filter((inv) => inv.status === "pending").length || 0
    const archivedCount = investigations.filter((inv) => inv.status === "archived").length || 0
    const totalCount = investigations.length

    return (
        <div className="space-y-6 w-full">
            <div className="flex flex-col gap-4 md:gap-8">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Investigations</h1>
                        <p className="text-muted-foreground">Gérez et suivez vos investigations OSINT en cours.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <NewCase>
                            <Button size="sm" className="h-8 gap-1">
                                <Plus className="h-3.5 w-3.5" />
                                <span>Nouvelle investigation</span>
                            </Button>
                        </NewCase>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 md:items-center">
                    <div className="relative flex-1 md:max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Rechercher..."
                            className="w-full rounded-lg bg-background pl-8 md:max-w-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 gap-1">
                                    <Filter className="h-3.5 w-3.5" />
                                    <span>Filtres</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72">
                                <Command>
                                    <CommandInput placeholder="Rechercher un filtre..." />
                                    <CommandList>
                                        <CommandEmpty>Aucun filtre trouvé.</CommandEmpty>
                                        <CommandGroup heading="Statut">
                                            <CommandItem>Actif</CommandItem>
                                            <CommandItem>En cours</CommandItem>
                                            <CommandItem>Archivé</CommandItem>
                                        </CommandGroup>
                                        <CommandGroup heading="Priorité">
                                            <CommandItem>Critique</CommandItem>
                                            <CommandItem>Haute</CommandItem>
                                            <CommandItem>Moyenne</CommandItem>
                                            <CommandItem>Basse</CommandItem>
                                        </CommandGroup>
                                        <CommandGroup heading="Tags">
                                            <CommandItem>Financial</CommandItem>
                                            <CommandItem>Corporate</CommandItem>
                                            <CommandItem>Cyber</CommandItem>
                                            <CommandItem>International</CommandItem>
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        <div className="flex items-center gap-1 md:gap-2">
                            <Button variant="default" size="icon" className="h-8 w-8">
                                <Grid3X3 className="h-4 w-4" />
                                <span className="sr-only">Grid view</span>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <List className="h-4 w-4" />
                                <span className="sr-only">List view</span>
                            </Button>
                        </div>

                        <Button variant="outline" size="sm" className="h-8 gap-1">
                            <span>Trier par</span>
                            <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="active" className="w-full">
                    <TabsList>
                        <TabsTrigger value="active" className="gap-1.5">
                            <AlertCircle className="h-4 w-4" />
                            <span>Actives</span>
                            <Badge className="ml-1" variant={"outline"}>{activeCount}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="pending" className="gap-1.5">
                            <Clock className="h-4 w-4" />
                            <span>En cours</span>
                            <Badge className="ml-1" variant={"outline"}>{pendingCount}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="archived" className="gap-1.5">
                            <Lock className="h-4 w-4" />
                            <span>Archivées</span>
                            <Badge className="ml-1" variant={"outline"}>{archivedCount}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="all" className="gap-1.5">
                            <Target className="h-4 w-4" />
                            <span>Toutes</span>
                            <Badge className="ml-1" variant={"outline"}>{totalCount}</Badge>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="mt-6">
                        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                            {investigations.map((investigation) => (
                                <Investigation key={investigation.id} investigation={investigation} />
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="active" className="mt-6">
                        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                            {investigations
                                .filter((inv) => inv.status === "active")
                                .map((investigation) => (
                                    <Investigation key={investigation.id} investigation={investigation} />
                                ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="pending" className="mt-6">
                        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                            {investigations
                                .filter((inv) => inv.status === "pending")
                                .map((investigation) => (
                                    <Investigation key={investigation.id} investigation={investigation} />
                                ))}
                        </div>
                    </TabsContent>
                    <TabsContent value="archived" className="mt-6">
                        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                            {investigations
                                .filter((inv) => inv.status === "archived")
                                .map((investigation) => (
                                    <Investigation key={investigation.id} investigation={investigation} />
                                ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div >
    )
}

export default DashboardPage

