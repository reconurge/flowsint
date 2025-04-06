"use client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, MapPin, Globe, Info, AtSign, Phone, Calendar, Link2, Mail, Shield, XIcon } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useFlowStore } from "@/store/flow-store"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useParams } from "next/navigation"
import SearchEmail from "./search-email"
import { memo } from "react"
import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/copy"

export default function ProfilePanel({ data, }: { data: any }) {
    const { project_id, investigation_id } = useParams()
    const { setCurrentNode } = useFlowStore()

    const closePanel = () => {
        setCurrentNode(null)
    }

    // if (type === "email") {
    //     return (
    //         <div className="overflow-auto h-full flex flex-col w-full !p-0 !m-0">
    //             <Button className="absolute top-2 right-2" size={"icon"} variant={"ghost"} onClick={closePanel}><XIcon className="h-5 w-5" /></Button>
    //             <div className="p-6 md:p-8">
    //                 <div className="grid grid-cols-1 gap-6">
    //                     {/* Left column with email info */}
    //                     <div className="space-y-6">
    //                         <div className="flex flex-col items-center gap-4">
    //                             <div className="bg-primary/10 p-3 rounded-full">
    //                                 <Mail className="h-8 w-8 text-primary" />
    //                             </div>
    //                             <div className="w-full text-center">
    //                                 <h2 className="text-xl w-full font-bold break-all">{data.email}</h2>
    //                                 <p className="text-sm text-muted-foreground">Email Address</p>
    //                             </div>
    //                             <SearchEmail investigation_id={investigation_id as string} email={data.email} />
    //                         </div>
    //                         <Separator />
    //                         <div className="space-y-4 text-center">
    //                             <div className="space-y-1 text-center">
    //                                 <div className="flex items-center justify-center gap-2 text-primary">
    //                                     <Shield className="h-4 w-4" />
    //                                     <span className="text-sm">Security Status</span>
    //                                 </div>
    //                                 <div className="flex gap-2 mt-1 items-center justify-center">
    //                                     <Badge variant={data.breach_found ? "destructive" : "outline"} className="px-3 py-1">
    //                                         {data.breach_found ? "Breach Found" : "No Breach Detected"}
    //                                     </Badge>
    //                                 </div>
    //                             </div>
    //                             <div className="space-y-1">
    //                                 <div className="flex items-center justify-center gap-2 text-primary">
    //                                     <Info className="h-4 w-4" />
    //                                     <span className="text-sm">Email ID</span>
    //                                 </div>
    //                                 <p className="text-xs font-mono text-center text-muted-foreground">{data.id}</p>
    //                             </div>
    //                         </div>
    //                     </div>
    //                     {/* Right column with related info */}
    //                     <div className="space-y-6">
    //                         <div className="space-y-1">
    //                             <div className="flex items-center justify-center gap-2 text-primary">
    //                                 <Link2 className="h-4 w-4" />
    //                                 <span className="text-sm">Associated Individual</span>
    //                             </div>
    //                             <p className="text-xs font-mono text-center text-muted-foreground">{data.individual_id}</p>
    //                         </div>
    //                         <div className="space-y-1">
    //                             <div className="flex items-center justify-center gap-2 text-primary">
    //                                 <Info className="h-4 w-4" />
    //                                 <span className="text-sm">Investigation ID</span>
    //                             </div>
    //                             <p className="text-xs font-mono text-center text-muted-foreground">{data.investigation_id}</p>
    //                         </div>
    //                     </div>
    //                 </div>
    //             </div>
    //         </div>)
    // }
    // if (type === "individual")
    //     return (
    //         <div className="overflow-auto h-full flex flex-col w-full !p-0 !m-0">
    //             <Button className="absolute top-2 right-2" size={"icon"} variant={"ghost"} onClick={closePanel}><XIcon className="h-5 w-5" /></Button>
    //             <div className="p-6 md:p-8">
    //                 <div className="grid grid-cols-1 gap-2">
    //                     {/* Left column with avatar */}
    //                     <div className="flex flex-col items-center gap-6">
    //                         <div className="relative flex flex-col items-center gap-4">
    //                             <Avatar className="w-28 h-28 border-4">
    //                                 <AvatarImage src={data.image_url} alt={data.full_name} />
    //                                 <AvatarFallback className="text-2xl">
    //                                     {data.full_name
    //                                         .split(" ")
    //                                         .map((n: any[]) => n[0])
    //                                         .join("")}
    //                                 </AvatarFallback>
    //                             </Avatar>
    //                             <Link href={`/dashboard/projects/${project_id}/individuals/${data.id}`}>
    //                                 <Button variant={"outline"}>View</Button>
    //                             </Link>
    //                         </div>
    //                         <div className="space-y-1 text-center">
    //                             <div className="flex items-center justify-center gap-2 text-primary">
    //                                 <User className="h-4 w-4" />
    //                                 <span className="text-sm">Full Name</span>
    //                             </div>
    //                             <h1 className="text-2xl font-bold tracking-tight">{data.full_name}</h1>
    //                         </div>

    //                         <div className="space-y-1 text-center">
    //                             <div className="flex items-center justify-center gap-2 text-primary">
    //                                 <Info className="h-4 w-4" />
    //                                 <span className="text-sm">Investigation ID</span>
    //                             </div>
    //                             <p className="text-sm font-mono">{data.investigation_id}</p>
    //                         </div>
    //                     </div>

    //                     {/* Middle column */}
    //                     <div className="space-y-6">
    //                         <div className="space-y-1">
    //                             <div className="flex items-center justify-center gap-2 text-primary">
    //                                 <AtSign className="h-4 w-4" />
    //                                 <span className="text-sm text-center">Email</span>
    //                             </div>
    //                             {data?.emails?.length > 0 ? (
    //                                 <p className="font-medium text-center">{data?.emails?.[0].email}</p>
    //                             ) : (
    //                                 <p className="text-gray-500 text-center">No email available</p>
    //                             )}
    //                         </div>

    //                         <div className="space-y-1">
    //                             <div className="flex items-center justify-center gap-2 text-primary">
    //                                 <Globe className="h-4 w-4" />
    //                                 <span className="text-sm text-center">Nationality</span>
    //                             </div>
    //                             <p className="font-medium text-center">{data.nationality || "Unknown"}</p>
    //                         </div>

    //                         <div className="space-y-1">
    //                             <div className="flex items-center justify-center gap-2 text-primary">
    //                                 <User className="h-4 w-4" />
    //                                 <span className="text-sm text-center">Gender</span>
    //                             </div>
    //                             <p className="font-medium text-center">{data.gender || "Unknown"}</p>
    //                         </div>

    //                         {data?.phone_numbers?.length > 0 && (
    //                             <div className="space-y-1">
    //                                 <div className="flex items-center justify-center gap-2 text-primary">
    //                                     <Phone className="h-4 w-4" />
    //                                     <span className="text-sm text-center">Phone Number</span>
    //                                 </div>
    //                                 <p className="font-medium text-center">{data?.phone_numbers?.[0]}</p>
    //                             </div>
    //                         )}
    //                     </div>

    //                     {/* Right column */}
    //                     <div className="space-y-6">
    //                         {data.birth_date && (
    //                             <div className="space-y-1">
    //                                 <div className="flex items-center justify-center gap-2 text-primary">
    //                                     <Calendar className="h-4 w-4" />
    //                                     <span className="text-sm text-center">Birth Date</span>
    //                                 </div>
    //                                 <p className="font-medium text-center">{data.birth_date}</p>
    //                             </div>
    //                         )}

    //                         <div className="space-y-1">
    //                             <div className="flex items-center justify-center gap-2 text-primary">
    //                                 <Info className="h-4 w-4" />
    //                                 <span className="text-sm text-center">Email Security</span>
    //                             </div>
    //                             <div className="flex gap-2 mt-1 justify-center">
    //                                 {data?.emails?.length > 0 && (
    //                                     <Badge
    //                                         variant={data.emails?.[0].breach_found ? "destructive" : "outline"}
    //                                     >
    //                                         {data.emails?.[0].breach_found ? "Breach Found" : "No Breach"}
    //                                     </Badge>
    //                                 )}
    //                             </div>
    //                         </div>

    //                         {data.physical_addresses?.length > 0 && (
    //                             <div className="space-y-1">
    //                                 <div className="flex items-center justify-center gap-2 text-primary">
    //                                     <MapPin className="h-4 w-4" />
    //                                     <span className="text-sm text-center">Location</span>
    //                                 </div>
    //                                 <p className="font-medium text-center">{data.physical_addresses?.[0]}</p>
    //                             </div>
    //                         )}

    //                         <div className="space-y-1">
    //                             <div className="flex items-center justify-center gap-2 text-primary">
    //                                 <Info className="h-4 w-4" />
    //                                 <span className="text-sm">Individual ID</span>
    //                             </div>
    //                             <p className="text-xs font-mono text-gray-400 text-center">{data.id}</p>
    //                         </div>
    //                     </div>
    //                 </div>
    //             </div>
    //         </div>
    //     )

    return (
        <KeyValueDisplay data={data} />
    )
}

interface KeyValueDisplayProps {
    data: Record<string, any>
    className?: string
}

function KeyValueDisplay({ data, className }: KeyValueDisplayProps) {
    return (
        <div className={cn("w-full overflow-y-auto overflow-x-hidden h-full border-collapse", className)}>
            {data && Object.entries(data)
                .filter(([key]) => !["id", "individual_id", "investigation_id", "group_id", "forceToolbarVisible"].includes(key))
                .map(([key, value], index) => {
                    const val = Array.isArray(value) ? `${value.length} items` : value?.toString() || null
                    return (
                        <div key={index} className="flex w-full items-center border-b border-border divide-x divide-border">
                            <div className="w-1/2 bg-background px-4 p-2 text-sm text-muted-foreground font-normal">{key}</div>
                            <div className="w-1/2 bg-background px-4 p-2 text-sm font-medium flex items-center justify-between"><div className="truncate font-semibold">{val || <span className="italic text-muted-foreground">N/A</span>}</div> <div>{val && <CopyButton className="h-6 w-6" content={val} />}</div></div>
                        </div>
                    )
                })}
        </div>
    )
}

export const MemoizedKeyValueDisplay = memo(KeyValueDisplay)