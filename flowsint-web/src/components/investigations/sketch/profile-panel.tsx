"use client"
import { MoreHorizontalIcon, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useParams } from "next/navigation"
import { memo, useCallback } from "react"
import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/copy"
import { toast } from "sonner"
import { checkEmail } from "@/lib/actions/search"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useConfirm } from "@/components/use-confirm-dialog"
import Link from "next/link"
export default function ProfilePanel({ data, type }: { data: any, type: string }) {
    const { investigation_id, project_id } = useParams()
    const { confirm } = useConfirm()

    const handleCheckEmail = useCallback(async () => {
        // @ts-ignore
        if (!data && data?.email) return toast.error("No email found.")
        if (!await confirm({ title: "Email scan", message: "This scan will look for some socials that the email might be associated with. The list is not exhaustive and might return false positives." })) return
        // @ts-ignore
        toast.promise(checkEmail(data?.email, investigation_id), {
            loading: "Loading...",
            success: () => {
                return `Scan on ${data?.email} has been launched.`
            },
            error: (error: any) => {
                return (
                    <div className="overflow-hidden">
                        <p className="font-bold">An error occured.</p>
                        <pre className="overflow-auto">
                            <code>{JSON.stringify(error, null, 2)}</code>
                        </pre>
                    </div>
                )
            },
        })
    }, [data, investigation_id])

    return (
        <div className=" overflow-y-auto overflow-x-hidden h-full">
            <div className="flex items-center sticky bg-background top-0 border-b justify-between px-4 py-2 gap-2 z-50">
                <h1 className="text-md font-semibold truncate">{data?.label}</h1>
                <div className="flex items-center gap-2">
                    {data?.type === "organization" ?
                        <Link href={`/dashboard/projects/${project_id}/organigrams/${data.id}`}>
                            <Button
                                className="relative min-w-[80px] h-8 overflow-hidden truncate bg-gradient-to-r from-purple-600 to-indigo-400 hover:from-purple-700 hover:to-indigo-500 transition-all duration-300 px-6 py-2 text-white border-none font-medium rounded-full"
                            >
                                <span className="flex items-center truncate gap-2">
                                    <Sparkles className={'h-4 w-4 transition-transform duration-300'} />
                                    <span className="block truncate">Organigram</span>
                                </span>
                                <span className="absolute inset-0 bg-black opacity-0 hover:opacity-10 transition-opacity duration-300" />
                            </Button>
                        </Link>
                        :
                        <Button
                            onClick={handleCheckEmail}
                            disabled={data?.type !== "email"}
                            className="relative min-w-[80px] h-8 overflow-hidden bg-gradient-to-r from-purple-600 to-indigo-400 hover:from-purple-700 hover:to-indigo-500 transition-all duration-300 px-6 py-2 text-white border-none font-medium rounded-full"
                        >
                            <span className="flex items-center gap-2">
                                <Sparkles className={'h-4 w-4 transition-transform duration-300'} />
                                <span>Search</span>
                            </span>
                            <span className="absolute inset-0 bg-black opacity-0 hover:opacity-10 transition-opacity duration-300" />
                        </Button>}
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
                .filter(([key]) => !["id", "individual_id", "investigation_id", "group_id", "forceToolbarVisible"].includes(key))
                .map(([key, value], index) => {
                    const val = Array.isArray(value) ? `${value.length} items` : value?.toString() || null
                    const display = (typeof val === "string" && val.startsWith("https://")) ? <a href={val} className="underline text-primary" target="_blank">{val}</a> : val
                    return (
                        <div key={index} className="flex w-full items-center border-b border-border divide-x divide-border">
                            <div className="w-1/2 bg-background px-4 p-2 text-sm text-muted-foreground font-normal">{key}</div>
                            <div className="w-1/2 bg-background px-4 p-2 text-sm font-medium flex items-center justify-between"><div className="truncate font-semibold">{display || <span className="italic text-muted-foreground">N/A</span>}</div> <div>{display && <CopyButton className="h-6 w-6" content={val} />}</div></div>
                        </div>
                    )
                })}
        </div>
    )
}

export const MemoizedKeyValueDisplay = memo(KeyValueDisplay)