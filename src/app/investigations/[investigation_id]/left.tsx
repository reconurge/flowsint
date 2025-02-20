"use client"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { AtSignIcon, PhoneIcon, UserIcon } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useInvestigationStore, useInvestigationData } from "@/store/investigation-store"
import { usePlatformIcons } from "@/lib/hooks/use-platform-icons"
import { useFlowStore } from "@/store/flow-store"

const Left = ({ investigation_id }: { investigation_id: string }) => {
    const platformsIcons = usePlatformIcons()
    useInvestigationData(investigation_id)
    const { currentNode, setCurrentNode } = useFlowStore()
    const {
        individuals,
        isLoadingIndividuals,
        emails,
        isLoadingEmails,
        phones,
        isLoadingPhones,
        socials,
        isLoadingSocials,
    } = useInvestigationStore()

    return (
        <div className="flex flex-col">
            <Accordion type="single" collapsible defaultValue="individuals">
                <AccordionItem value="individuals">
                    <AccordionTrigger className="p-2 px-4 hover:bg-sidebar-accent text-sidebar-accent-foreground/60 hover:text-sidebar-accent-foreground text-sm rounded-none">
                        Profiles {!isLoadingIndividuals && <>({individuals?.length})</>}
                    </AccordionTrigger>
                    <AccordionContent>
                        {isLoadingIndividuals && (
                            <div className="flex flex-col gap-1">
                                <Skeleton className="w-full h-[20px] bg-foreground/10 rounded-none" />
                                <Skeleton className="w-full h-[20px] bg-foreground/10 rounded-none" />
                                <Skeleton className="w-full h-[20px] bg-foreground/10 rounded-none" />
                            </div>
                        )}
                        <ul>
                            {individuals?.map((individual: any) => (
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
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            <Accordion type="single" collapsible defaultValue="emails">
                <AccordionItem value="emails">
                    <AccordionTrigger className="p-2 px-4 hover:bg-sidebar-accent text-sidebar-accent-foreground/60 hover:text-sidebar-accent-foreground text-sm rounded-none">
                        Emails {!isLoadingEmails && <>({emails?.length})</>}
                    </AccordionTrigger>
                    <AccordionContent>
                        {isLoadingEmails && (
                            <div className="flex flex-col gap-1">
                                <Skeleton className="w-full h-[20px] bg-foreground/10 rounded-none" />
                                <Skeleton className="w-full h-[20px] bg-foreground/10 rounded-none" />
                                <Skeleton className="w-full h-[20px] bg-foreground/10 rounded-none" />
                            </div>
                        )}
                        <ul>
                            {emails?.map((email: any) => (
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
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            <Accordion type="single" collapsible defaultValue="phones">
                <AccordionItem value="phones">
                    <AccordionTrigger className="p-2 px-4 hover:bg-sidebar-accent text-sidebar-accent-foreground/60 hover:text-sidebar-accent-foreground text-sm rounded-none">
                        Phones {!isLoadingPhones && <>({phones?.length})</>}
                    </AccordionTrigger>
                    <AccordionContent>
                        {isLoadingPhones && (
                            <div className="flex flex-col gap-1">
                                <Skeleton className="w-full h-[20px] bg-foreground/10 rounded-none" />
                                <Skeleton className="w-full h-[20px] bg-foreground/10 rounded-none" />
                                <Skeleton className="w-full h-[20px] bg-foreground/10 rounded-none" />
                            </div>
                        )}
                        <ul>
                            {phones?.map((phone: any) => (
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
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            <Accordion type="single" collapsible defaultValue="socials">
                <AccordionItem value="socials">
                    <AccordionTrigger className="p-2 px-4 hover:bg-sidebar-accent text-sidebar-accent-foreground/60 hover:text-sidebar-accent-foreground text-sm rounded-none">
                        Socials {!isLoadingSocials && <>({socials?.length})</>}
                    </AccordionTrigger>
                    <AccordionContent>
                        {isLoadingSocials && (
                            <div className="flex flex-col gap-1">
                                <Skeleton className="w-full h-[20px] bg-foreground/10 rounded-none" />
                                <Skeleton className="w-full h-[20px] bg-foreground/10 rounded-none" />
                                <Skeleton className="w-full h-[20px] bg-foreground/10 rounded-none" />
                            </div>
                        )}
                        <ul>
                            {socials?.map((social: any) => (
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
                                            {platformsIcons?.[social?.platform]?.icon}
                                        </span>
                                        {social.username || social.profile_url}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    )
}

export default Left

