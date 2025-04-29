"use client"
import { MoreHorizontalIcon, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useParams } from "next/navigation"
import { memo } from "react"
import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/copy"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import LaunchTransform from "./launch-transform"

export default function ProfilePanel({ data }: { data: any }) {
    const { sketch_id, investigation_id } = useParams()
    return (
        <div className=" overflow-y-auto overflow-x-hidden h-full">
            <div className="flex items-center sticky bg-card top-0 border-b justify-between px-4 py-2 gap-2 z-50">
                <h1 className="text-md font-semibold truncate">{data?.label}</h1>
                <div className="flex items-center gap-2">
                    {data?.type === "organization" &&
                        <Link href={`/dashboard/investigations/${investigation_id}/organigrams/${data?.id}`}>
                            <Button
                                className="relative min-w-[80px] h-8 overflow-hidden truncate bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary transition-all duration-300 px-6 py-2 text-white border-none font-medium rounded-full"
                            >
                                <span className="flex items-center truncate gap-2">
                                    <Sparkles className={'h-4 w-4 transition-transform duration-300'} />
                                    <span className="block truncate">Organigram</span>
                                </span>
                                <span className="absolute inset-0 bg-black opacity-0 hover:opacity-10 transition-opacity duration-300" />
                            </Button>
                        </Link>}
                    {/* <LaunchTransform values={data.label} sketch_id={sketch_id as string} type={data?.type} /> */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant={"ghost"} size={"icon"}><MoreHorizontalIcon /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Hide</DropdownMenuItem>
                            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <KeyValueDisplay data={data} />
        </div>
    )
}

interface KeyValueDisplayProps {
    data: Record<string, any>
    className?: string
}

function KeyValueDisplay({ data, className }: KeyValueDisplayProps) {
    return (
        <div className={cn("w-full border-collapse", className)}>
            {data && Object.entries(data)
                .filter(([key]) => !["id", "individual_id", "sketch_id", "group_id", "forceToolbarVisible"].includes(key))
                .map(([key, value], index) => {
                    const val = Array.isArray(value) ? `${value.length} items` : value?.toString() || null
                    const display = (typeof val === "string" && val.startsWith("https://")) ? <a href={val} className="underline text-primary" target="_blank">{val}</a> : val
                    return (
                        <div key={index} className="flex w-full items-center border-b border-border divide-x divide-border">
                            <div className="w-1/2 bg-card px-4 p-2 text-sm text-muted-foreground font-normal">{key}</div>
                            <div className="w-1/2 bg-card px-4 p-2 text-sm font-medium flex items-center justify-between"><div className="truncate font-semibold">{display || <span className="italic text-muted-foreground">N/A</span>}</div> <div>{display && <CopyButton className="h-6 w-6" content={val} />}</div></div>
                        </div>
                    )
                })}
        </div>
    )
}

export const MemoizedKeyValueDisplay = memo(KeyValueDisplay)