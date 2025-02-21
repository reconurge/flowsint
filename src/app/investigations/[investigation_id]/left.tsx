"use client"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { AtSignIcon, PhoneIcon, RotateCwIcon, UserIcon } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useInvestigationStore } from "@/store/investigation-store"
import { usePlatformIcons } from "@/lib/hooks/use-platform-icons"
import { useFlowStore } from "@/store/flow-store"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useMemo } from "react"

const Left = ({ investigation_id }: { investigation_id: string }) => {
    const platformsIcons = usePlatformIcons()
    const { currentNode, setCurrentNode } = useFlowStore()
    const [filterValue, setFilterValue] = useState("")

    // Utiliser le hook useInvestigationData pour récupérer les données
    const {
        individuals,
        emails,
        phones,
        socials,
        refetchAll
    } = useInvestigationStore((state) => state.useInvestigationData(investigation_id))
    const { isRefetching } = useInvestigationStore()

    // Filtrer les données
    const filteredData = useMemo(() => {
        const searchTerm = filterValue.toLowerCase().trim()
        return {
            individuals: individuals.data.filter(individual =>
                individual.full_name.toLowerCase().includes(searchTerm)
            ),
            emails: emails.data.filter(email =>
                email.email.toLowerCase().includes(searchTerm)
            ),
            phones: phones.data.filter(phone =>
                phone.phone_number.toLowerCase().includes(searchTerm)
            ),
            socials: socials.data.filter(social =>
                (social.username?.toLowerCase() || social.profile_url?.toLowerCase() || "")
                    .includes(searchTerm)
            )
        }
    }, [filterValue, individuals.data, emails.data, phones.data, socials.data])

    // Composant réutilisable pour le skeleton loader
    const LoadingSkeleton = () => (
        <div className="flex flex-col gap-1">
            <Skeleton className="w-full h-[20px] bg-foreground/10 rounded-none" />
            <Skeleton className="w-full h-[20px] bg-foreground/10 rounded-none" />
            <Skeleton className="w-full h-[20px] bg-foreground/10 rounded-none" />
        </div>
    )

    return (
        <div className="flex flex-col w-full">
            <div className="flex items-center gap-2 p-2 border-b">
                <Input
                    className="h-7"
                    placeholder="Filter..."
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                />
                <Button
                    className="h-7 w-7 opacity-70"
                    variant="ghost"
                    disabled={isRefetching}
                    onClick={refetchAll}
                >
                    <RotateCwIcon className={cn(isRefetching && 'animate-spin', 'h-5 w-5')} />
                </Button>
            </div>
            <Accordion type="single" collapsible defaultValue="individuals">
                <AccordionItem value="individuals">
                    <AccordionTrigger className="p-2 px-4 hover:bg-sidebar-accent text-sidebar-accent-foreground/60 hover:text-sidebar-accent-foreground text-sm rounded-none">
                        Profiles {!individuals.isLoading && <>({filteredData.individuals.length})</>}
                    </AccordionTrigger>
                    <AccordionContent>
                        {individuals.isLoading ? (
                            <LoadingSkeleton />
                        ) : (
                            <ul>
                                {filteredData.individuals.map((individual) => (
                                    <li
                                        className={cn(
                                            "hover:bg-sidebar-accent text-sidebar-accent-foreground/90 hover:text-sidebar-accent-foreground text-sm",
                                            currentNode === individual.id && "bg-sidebar-accent text-sidebar-accent-foreground",
                                        )}
                                        key={individual.id}
                                    >
                                        <button
                                            onClick={() => setCurrentNode(individual.id)}
                                            className="flex items-center p-1 px-4 w-full gap-2"
                                        >
                                            <UserIcon className="h-3 w-3 opacity-60" />
                                            {individual.full_name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <Accordion type="single" collapsible defaultValue="emails">
                <AccordionItem value="emails">
                    <AccordionTrigger className="p-2 px-4 hover:bg-sidebar-accent text-sidebar-accent-foreground/60 hover:text-sidebar-accent-foreground text-sm rounded-none">
                        Emails {!emails.isLoading && <>({filteredData.emails.length})</>}
                    </AccordionTrigger>
                    <AccordionContent>
                        {emails.isLoading ? (
                            <LoadingSkeleton />
                        ) : (
                            <ul>
                                {filteredData.emails.map((email) => (
                                    <li
                                        className={cn(
                                            "hover:bg-sidebar-accent text-sidebar-accent-foreground/90 hover:text-sidebar-accent-foreground text-sm",
                                            currentNode === email.id && "bg-sidebar-accent text-sidebar-accent-foreground",
                                        )}
                                        key={email.id}
                                    >
                                        <button onClick={() => setCurrentNode(email.id)} className="flex items-center p-1 px-4 w-full gap-2">
                                            <AtSignIcon className="h-3 w-3 opacity-60" />
                                            {email.email}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <Accordion type="single" collapsible defaultValue="phones">
                <AccordionItem value="phones">
                    <AccordionTrigger className="p-2 px-4 hover:bg-sidebar-accent text-sidebar-accent-foreground/60 hover:text-sidebar-accent-foreground text-sm rounded-none">
                        Phones {!phones.isLoading && <>({filteredData.phones.length})</>}
                    </AccordionTrigger>
                    <AccordionContent>
                        {phones.isLoading ? (
                            <LoadingSkeleton />
                        ) : (
                            <ul>
                                {filteredData.phones.map((phone) => (
                                    <li
                                        className={cn(
                                            "hover:bg-sidebar-accent text-sidebar-accent-foreground/90 hover:text-sidebar-accent-foreground text-sm",
                                            currentNode === phone.id && "bg-sidebar-accent text-sidebar-accent-foreground",
                                        )}
                                        key={phone.id}
                                    >
                                        <button onClick={() => setCurrentNode(phone.id)} className="flex items-center p-1 px-4 w-full gap-2">
                                            <PhoneIcon className="h-3 w-3 opacity-60" />
                                            {phone.phone_number}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <Accordion type="single" collapsible defaultValue="socials">
                <AccordionItem value="socials">
                    <AccordionTrigger className="p-2 px-4 hover:bg-sidebar-accent text-sidebar-accent-foreground/60 hover:text-sidebar-accent-foreground text-sm rounded-none">
                        Socials {!socials.isLoading && <>({filteredData.socials.length})</>}
                    </AccordionTrigger>
                    <AccordionContent>
                        {socials.isLoading ? (
                            <LoadingSkeleton />
                        ) : (
                            <ul>
                                {filteredData.socials.map((social) => (
                                    <li
                                        className={cn(
                                            "hover:bg-sidebar-accent text-sidebar-accent-foreground/90 hover:text-sidebar-accent-foreground text-sm",
                                            currentNode === social.id && "bg-sidebar-accent text-sidebar-accent-foreground",
                                        )}
                                        key={social.id}
                                    >
                                        <button onClick={() => setCurrentNode(social.id)} className="flex items-center p-1 px-4 w-full gap-2">
                                            <span className="opacity-60">
                                                {/* @ts-ignore */}
                                                {platformsIcons?.[social.platform]?.icon}
                                            </span>
                                            {social.username || social.profile_url}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    )
}

export default Left