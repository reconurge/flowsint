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

export default function ProfilePanel({ data, type }: { data: any, type: "individual" | "email" }) {
    const { project_id, investigation_id } = useParams()
    const { setCurrentNode } = useFlowStore()

    const closePanel = () => {
        setCurrentNode(null)
    }

    if (type === "email") {
        return (
            <div className="overflow-auto h-full flex flex-col w-full !p-0 !m-0">
                <Button className="absolute top-2 right-2" size={"icon"} variant={"ghost"} onClick={closePanel}><XIcon className="h-5 w-5" /></Button>
                <div className="p-6 md:p-8">
                    <div className="grid grid-cols-1 gap-6">
                        {/* Left column with email info */}
                        <div className="space-y-6">
                            <div className="flex flex-col items-center gap-4">
                                <div className="bg-primary/10 p-3 rounded-full">
                                    <Mail className="h-8 w-8 text-primary" />
                                </div>
                                <div className="w-full text-center">
                                    <h2 className="text-xl w-full font-bold break-all">{data.email}</h2>
                                    <p className="text-sm text-muted-foreground">Email Address</p>
                                </div>
                                <SearchEmail investigation_id={investigation_id as string} email={data.email} />
                            </div>
                            <Separator />
                            <div className="space-y-4 text-center">
                                <div className="space-y-1 text-center">
                                    <div className="flex items-center justify-center gap-2 text-primary">
                                        <Shield className="h-4 w-4" />
                                        <span className="text-sm">Security Status</span>
                                    </div>
                                    <div className="flex gap-2 mt-1 items-center justify-center">
                                        <Badge variant={data.breach_found ? "destructive" : "outline"} className="px-3 py-1">
                                            {data.breach_found ? "Breach Found" : "No Breach Detected"}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-center gap-2 text-primary">
                                        <Info className="h-4 w-4" />
                                        <span className="text-sm">Email ID</span>
                                    </div>
                                    <p className="text-xs font-mono text-center text-muted-foreground">{data.id}</p>
                                </div>
                            </div>
                        </div>
                        {/* Right column with related info */}
                        <div className="space-y-6">
                            <div className="space-y-1">
                                <div className="flex items-center justify-center gap-2 text-primary">
                                    <Link2 className="h-4 w-4" />
                                    <span className="text-sm">Associated Individual</span>
                                </div>
                                <p className="text-xs font-mono text-center text-muted-foreground">{data.individual_id}</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center justify-center gap-2 text-primary">
                                    <Info className="h-4 w-4" />
                                    <span className="text-sm">Investigation ID</span>
                                </div>
                                <p className="text-xs font-mono text-center text-muted-foreground">{data.investigation_id}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>)
    }
    if (type === "individual")
        return (
            <div className="overflow-auto h-full flex flex-col w-full !p-0 !m-0">
                <Button className="absolute top-2 right-2" size={"icon"} variant={"ghost"} onClick={closePanel}><XIcon className="h-5 w-5" /></Button>
                <div className="p-6 md:p-8">
                    <div className="grid grid-cols-1 gap-2">
                        {/* Left column with avatar */}
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative flex flex-col items-center gap-4">
                                <Avatar className="w-28 h-28 border-4 border-primary/20">
                                    <AvatarImage src={data.image_url} alt={data.full_name} />
                                    <AvatarFallback className="text-2xl">
                                        {data.full_name
                                            .split(" ")
                                            .map((n: any[]) => n[0])
                                            .join("")}
                                    </AvatarFallback>
                                </Avatar>
                                <Link href={`/dashboard/projects/${project_id}/individuals/${data.id}`}>
                                    <Button variant={"outline"}>View</Button>
                                </Link>
                            </div>
                            <div className="space-y-1 text-center md:text-left">
                                <div className="flex items-center gap-2 text-primary">
                                    <User className="h-4 w-4" />
                                    <span className="text-sm">Full Name</span>
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight">{data.full_name}</h1>
                            </div>

                            <div className="space-y-1 text-center md:text-left">
                                <div className="flex items-center gap-2 text-primary">
                                    <Info className="h-4 w-4" />
                                    <span className="text-sm">Investigation ID</span>
                                </div>
                                <p className="text-sm font-mono">{data.investigation_id}</p>
                            </div>
                        </div>

                        {/* Middle column */}
                        <div className="space-y-6">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-primary">
                                    <AtSign className="h-4 w-4" />
                                    <span className="text-sm">Email</span>
                                </div>
                                {data?.emails?.length > 0 ? (
                                    <p className="font-medium">{data?.emails?.[0].email}</p>
                                ) : (
                                    <p className="text-gray-500">No email available</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-primary">
                                    <Globe className="h-4 w-4" />
                                    <span className="text-sm">Nationality</span>
                                </div>
                                <p className="font-medium">{data.nationality || "Unknown"}</p>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-primary">
                                    <User className="h-4 w-4" />
                                    <span className="text-sm">Gender</span>
                                </div>
                                <p className="font-medium">{data.gender || "Unknown"}</p>
                            </div>

                            {data?.phone_numbers?.length > 0 && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-primary">
                                        <Phone className="h-4 w-4" />
                                        <span className="text-sm">Phone Number</span>
                                    </div>
                                    <p className="font-medium">{data?.phone_numbers?.[0]}</p>
                                </div>
                            )}
                        </div>

                        {/* Right column */}
                        <div className="space-y-6">
                            {data.birth_date && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-primary">
                                        <Calendar className="h-4 w-4" />
                                        <span className="text-sm">Birth Date</span>
                                    </div>
                                    <p className="font-medium">{data.birth_date}</p>
                                </div>
                            )}

                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-primary">
                                    <Info className="h-4 w-4" />
                                    <span className="text-sm">Email Security</span>
                                </div>
                                <div className="flex gap-2 mt-1">
                                    {data?.emails?.length > 0 && (
                                        <Badge
                                            variant={data.emails?.[0].breach_found ? "destructive" : "outline"}
                                        >
                                            {data.emails?.[0].breach_found ? "Breach Found" : "No Breach"}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {data.physical_addresses?.length > 0 && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-primary">
                                        <MapPin className="h-4 w-4" />
                                        <span className="text-sm">Location</span>
                                    </div>
                                    <p className="font-medium">{data.physical_addresses?.[0]}</p>
                                </div>
                            )}

                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-primary">
                                    <Info className="h-4 w-4" />
                                    <span className="text-sm">Individual ID</span>
                                </div>
                                <p className="text-xs font-mono text-gray-400">{data.id}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
}

