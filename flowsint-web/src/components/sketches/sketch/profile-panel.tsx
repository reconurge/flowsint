"use client"
import { HelpCircle, MoreHorizontalIcon, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useParams } from "next/navigation"
import { memo, useMemo } from "react"
import { cn, hexToRgba } from "@/lib/utils"
import { CopyButton } from "@/components/copy"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { actionItems } from "@/lib/action-items"
import LaunchTransform from "./launch-transform"
import { IconContainer } from "@/components/icon-container"

export default function ProfilePanel({ data, sketch_id }: { data: any, sketch_id?: string }) {
    const item = useMemo(() =>
        (actionItems as any).find((a: any) => a.type === data?.type),
        [data?.type]
    )
    const Icon = item?.icon || HelpCircle
    return (
        <div className=" overflow-y-auto overflow-x-hidden h-full">
            <div className="flex items-center sticky bg-card top-0 border-b justify-start px-4 py-2 gap-2 z-50">
                <IconContainer
                    type={data?.type}
                    icon={Icon}
                    size={20}
                />
                <h1 className="text-md font-semibold truncate">{data?.label}</h1>
                <div className="grow" />
                <div className="flex items-center gap-2">
                    <LaunchTransform values={[data.label]} sketch_id={sketch_id as string} type={data?.type} />
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
                .filter(([key]) => !["individual_id", "forceToolbarVisible"].includes(key))
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