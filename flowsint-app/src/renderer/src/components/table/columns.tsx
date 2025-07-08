import { ColumnDef } from "@tanstack/react-table"
import { useIcon } from "@/hooks/use-icon"
import { MoreVertical, AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"
import { TypeBadge } from "@/components/type-badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "../ui/checkbox"
import { useCallback, memo } from "react"
import { GraphNode, useGraphStore } from "@/stores/graph-store"
import { Badge } from "@/components/ui/badge"

// Memoized icon component to prevent unnecessary re-renders
const MemoizedIcon = memo(({ type, size = 16 }: { type: string; size?: number }) => {
    const IconComponent = useIcon(type)
    return <IconComponent size={size} />
})
MemoizedIcon.displayName = 'MemoizedIcon'

// Helper function to get status styling
const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
        case 'active':
            return { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', icon: CheckCircle }
        case 'pending':
            return { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', icon: Clock }
        case 'error':
            return { bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800', icon: XCircle }
        case 'warning':
            return { bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800', icon: AlertTriangle }
        default:
            return { bg: 'bg-gray-50 dark:bg-gray-900', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700', icon: Clock }
    }
}

// Helper function to get priority styling
const getPriorityStyle = (priority: string) => {
    switch (priority?.toLowerCase()) {
        case 'high':
            return { bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' }
        case 'medium':
            return { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' }
        case 'low':
            return { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' }
        default:
            return { bg: 'bg-gray-50 dark:bg-gray-900', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' }
    }
}

// Helper function to get risk level styling
const getRiskStyle = (risk: string) => {
    switch (risk?.toLowerCase()) {
        case 'critical':
            return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-200' }
        case 'high':
            return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-200' }
        case 'medium':
            return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-200' }
        case 'low':
            return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-200' }
        default:
            return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-200' }
    }
}

// Helper function to get confidence color
const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-emerald-600 dark:text-emerald-400'
    if (confidence >= 60) return 'text-amber-600 dark:text-amber-400'
    if (confidence >= 40) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
}

export const columns: ColumnDef<GraphNode>[] = [
    {
        size: 50,
        minSize: 50,
        maxSize: 50,
        enableResizing: false,
        accessorKey: "icon",
        header: () => {
            const setSelectedNodes = useGraphStore(s => s.setSelectedNodes)
            const nodes = useGraphStore(s => s.nodes)
            const handleToggleCheckAll = useCallback(
                (checked: boolean) => {
                    if (!checked) {
                        setSelectedNodes([])
                        return
                    }
                    else setSelectedNodes(nodes)
                },
                [nodes, setSelectedNodes],
            )
            return (<div className="flex items-center h-full"><Checkbox onCheckedChange={handleToggleCheckAll} /></div>)
        },
        cell: ({ row }) => {
            const toggleNodeSelection = useGraphStore(s => s.toggleNodeSelection)
            const selectedNodes = useGraphStore(s => s.selectedNodes)
            const toggleNode = useCallback(() => toggleNodeSelection(row.original, true), [])
            const isNodeChecked = useCallback(
                (nodeId: string) => {
                    return selectedNodes.some((node) => node.id === nodeId)
                },
                [selectedNodes],
            )
            return <div className="flex items-center"><Checkbox checked={isNodeChecked(row.original.id)} onCheckedChange={toggleNode} /></div>
        },
    },
    {
        enableResizing: true,
        accessorKey: "data.label",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    className="h-7"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Label
                    <ArrowUpDown className="h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const setCurrentNode = useGraphStore(s => s.setCurrentNode)
            // const IconComponent = useIcon(row.original.data.type)
            const setOpenNodeEditorModal = useGraphStore(s => s.setOpenNodeEditorModal)
            const openEdit = useCallback((e: React.MouseEvent) => {
                e.stopPropagation();
                const typedNode = row.original as GraphNode
                setCurrentNode(typedNode)
                setOpenNodeEditorModal(true)
            }, [row.original, setCurrentNode, setOpenNodeEditorModal])

            return (
                <button
                    onClick={openEdit}
                    className="text-left font-medium flex items-center gap-2 h-full truncate text-ellipsis w-full rounded-md p-2 transition-colors duration-200"
                >
                    {/* <div className="flex-shrink-0">
                        <IconComponent size={16} />
                    </div> */}
                    <span className="hover:text-primary truncate text-[.9rem] block font-medium transition-colors duration-200">
                        {row.original.data.label}
                    </span>
                </button>
            )
        }
    },
    {
        enableResizing: true,
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    className="h-7"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Type
                    <ArrowUpDown className="h-4 w-4" />
                </Button>
            )
        },
        size: 100,
        minSize: 110,
        maxSize: 150,
        accessorKey: "data.type",
        cell: ({ row }) => {
            const type = row.original.data.type
            return (
                <div className="text-center flex justify-center w-full font-medium flex items-center gap-2">
                    <TypeBadge className="w-full" type={type} />
                </div>
            )
        }
    },
    {
        enableResizing: true,
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    className="h-7"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Status
                    <ArrowUpDown className="h-4 w-4" />
                </Button>
            )
        },
        accessorKey: "data.status",
        cell: ({ row }) => {
            const status = row.original.data.status || 'Active'
            const style = getStatusStyle(status)
            const IconComponent = style.icon

            return (
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border ${style.bg} ${style.text} ${style.border} text-xs font-medium`}>
                    <IconComponent size={12} />
                    <span className="capitalize">{status}</span>
                </div>
            )
        }
    },
    {
        enableResizing: true,
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    className="h-7"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Priority
                    <ArrowUpDown className="h-4 w-4" />
                </Button>
            )
        },
        accessorKey: "data.priority",
        cell: ({ row }) => {
            const priority = row.original.data.priority || 'Medium'
            const style = getPriorityStyle(priority)

            return (
                <Badge
                    variant="outline"
                    className={`${style.bg} ${style.text} ${style.border} font-medium capitalize text-xs`}
                >
                    {priority}
                </Badge>
            )
        }
    },
    {
        enableResizing: true,
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    className="h-7"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Category
                    <ArrowUpDown className="h-4 w-4" />
                </Button>
            )
        },
        accessorKey: "data.category",
        cell: ({ row }) => {
            const category = row.original.data.category || 'Network'
            return (
                <div className="text-left font-medium text-gray-700 dark:text-gray-300">
                    {category}
                </div>
            )
        }
    },
    {
        enableResizing: true,
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    className="h-7"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Source
                    <ArrowUpDown className="h-4 w-4" />
                </Button>
            )
        },
        accessorKey: "data.source",
        cell: ({ row }) => {
            const source = row.original.data.source || 'Scanner'
            return (
                <div className="text-left font-medium text-gray-700 dark:text-gray-300">
                    {source}
                </div>
            )
        }
    },
    {
        enableResizing: true,
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    className="h-7"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Confidence
                    <ArrowUpDown className="h-4 w-4" />
                </Button>
            )
        },
        accessorKey: "data.confidence",
        cell: ({ row }) => {
            const confidence = 85 // row.original.data.confidence || 85
            const color = getConfidenceColor(confidence)

            return (
                <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${color.replace('text-', 'bg-')}`}
                            style={{ width: `${confidence}%` }}
                        />
                    </div>
                    <span className={`text-xs font-medium ${color} min-w-[2.5rem]`}>
                        {confidence}%
                    </span>
                </div>
            )
        }
    },
    {
        enableResizing: true,
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    className="h-7"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Risk Level
                    <ArrowUpDown className="h-4 w-4" />
                </Button>
            )
        },
        accessorKey: "data.riskLevel",
        cell: ({ row }) => {
            const risk = row.original.data.riskLevel || 'Low'
            const style = getRiskStyle(risk)

            return (
                <div className={`inline-flex items-center px-2 py-1 rounded-md ${style.bg} ${style.text} text-xs font-medium capitalize`}>
                    {risk}
                </div>
            )
        }
    },
    {
        enableResizing: true,
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    className="h-7"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Tags
                    <ArrowUpDown className="h-4 w-4" />
                </Button>
            )
        },
        accessorKey: "data.tags",
        cell: ({ row }) => {
            const tags = row.original.data.tags || 'infrastructure'
            return (
                <div className="text-left font-medium text-gray-600 dark:text-gray-400 text-xs">
                    {tags}
                </div>
            )
        }
    },
    {
        enableResizing: true,
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    className="h-7"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Last Updated
                    <ArrowUpDown className="h-4 w-4" />
                </Button>
            )
        },
        accessorKey: "data.lastUpdated",
        cell: ({ row }) => {
            const date = row.original.data.lastUpdated || '2024-01-15'
            return (
                <div className="text-left font-medium text-gray-500 dark:text-gray-400 text-xs">
                    {date}
                </div>
            )
        }
    },
    {
        enableResizing: true,
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    className="h-7"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Owner
                    <ArrowUpDown className="h-4 w-4" />
                </Button>
            )
        },
        accessorKey: "data.owner",
        cell: ({ row }) => {
            const owner = row.original.data.owner || 'Team A'
            return (
                <div className="text-left font-medium text-gray-700 dark:text-gray-300">
                    {owner}
                </div>
            )
        }
    },
    {
        enableResizing: true,
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    className="h-7"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Version
                    <ArrowUpDown className="h-4 w-4" />
                </Button>
            )
        },
        accessorKey: "data.version",
        cell: ({ row }) => {
            const version = row.original.data.version || '1.2.3'
            return (
                <div className="text-left font-medium text-gray-500 dark:text-gray-400 font-mono text-xs">
                    v{version}
                </div>
            )
        }
    },
    {
        enableResizing: true,
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    className="h-7"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Environment
                    <ArrowUpDown className="h-4 w-4" />
                </Button>
            )
        },
        accessorKey: "data.environment",
        cell: ({ row }) => {
            const env = row.original.data.environment || 'Production'
            const isProduction = env.toLowerCase() === 'production'

            return (
                <div className={`text-left font-medium text-xs ${isProduction
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                    {env}
                </div>
            )
        }
    },
    {
        id: "actions",
        size: 50,
        minSize: 50,
        maxSize: 50,
        enableResizing: false,
        header: ({ column }) => {
            return (
                <div className="w-[50]"></div>
            )
        },
        cell: ({ row }) => {
            return (
                <div className="flex items-center justify-center w-full h-full">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div>
                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200">
                                    <span className="sr-only">Open menu</span>
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                            ></DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )
        },
    },
]